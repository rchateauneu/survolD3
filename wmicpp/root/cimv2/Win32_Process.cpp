#include <string>
#include <stdexcept>

#include "../../wmiclasses.h"
#include <windows.h> // For WinAPI functions
#include <psapi.h>   // For GetModuleFileNameEx
#include <algorithm> // For std::find_last_of
#include <stdexcept> // For std::stoi exceptions
#include <winternl.h> // For PEB and NtQueryInformationProcess

// Function pointer for the internal NT API
typedef NTSTATUS(NTAPI* pNtQueryInformationProcess)(
    HANDLE ProcessHandle,
    PROCESSINFOCLASS ProcessInformationClass,
    PVOID ProcessInformation,
    ULONG ProcessInformationLength,
    PULONG ReturnLength
);

using std::string;
using std::map;
using std::variant;
using std::cout;
using std::endl;
using std::cerr;
using std::vector;
using std::wstring;
using std::to_string;
using std::runtime_error;

class Win32_Process : public WmiClassTemplate<Win32_Process> {
private:
    /**
     * Helper to retrieve the command line of another process by walking its PEB.
     */
    static string GetCommandLineInternal(HANDLE hProcess) {
        HMODULE hNtdll = GetModuleHandleA("ntdll.dll");
        if (!hNtdll) return "";

        auto NtQueryInfo = (pNtQueryInformationProcess)GetProcAddress(hNtdll, "NtQueryInformationProcess");
        if (!NtQueryInfo) return "";

        PROCESS_BASIC_INFORMATION pbi;
        ULONG retLen;
        NTSTATUS status = NtQueryInfo(hProcess, ProcessBasicInformation, &pbi, sizeof(pbi), &retLen);
        if (status != 0) return "";

        // 1. Read the PEB structure from the target process
        PEB peb;
        SIZE_T bytesRead;
        if (!ReadProcessMemory(hProcess, pbi.PebBaseAddress, &peb, sizeof(peb), &bytesRead)) return "";

        // 2. Read the ProcessParameters (RTL_USER_PROCESS_PARAMETERS)
        // Note: The PEB structure in winternl.h is partial. ProcessParameters is a pointer.
        RTL_USER_PROCESS_PARAMETERS params;
        if (!ReadProcessMemory(hProcess, peb.ProcessParameters, &params, sizeof(params), &bytesRead)) return "";

        // 3. Read the Actual Command Line buffer (Unicode)
        if (params.CommandLine.Length == 0) return "";

        vector<wchar_t> buffer(params.CommandLine.Length / sizeof(wchar_t) + 1, 0);
        if (!ReadProcessMemory(hProcess, params.CommandLine.Buffer, buffer.data(), params.CommandLine.Length, &bytesRead)) {
            return "";
        }

        return WideToUtf8(buffer.data());
    }

    /**
     * Helper to convert Windows Wide strings to UTF-8 std::string
     */
    static string WideToUtf8(const wstring& wstr) {
        if (wstr.empty()) return "";
        int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
        string strTo(size_needed, 0);
        WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
        return strTo;
    }

    /**
     * Helper to retrieve the owner (Domain\User) of a process using its access token.
     */
    static string GetOwnerInternal(HANDLE hProcess) {
        HANDLE hToken = NULL;
        if (!OpenProcessToken(hProcess, TOKEN_QUERY, &hToken)) return "";

        DWORD dwSize = 0;
        GetTokenInformation(hToken, TokenUser, NULL, 0, &dwSize);
        if (dwSize == 0) {
            CloseHandle(hToken);
            return "";
        }

        vector<unsigned char> buffer(dwSize);
        if (!GetTokenInformation(hToken, TokenUser, buffer.data(), dwSize, &dwSize)) {
            CloseHandle(hToken);
            return "";
        }

        PTOKEN_USER pTokenUser = reinterpret_cast<PTOKEN_USER>(buffer.data());
        wchar_t name[256], domain[256];
        DWORD nameLen = 256, domainLen = 256;
        SID_NAME_USE snu;

        string owner = "";
        if (LookupAccountSidW(NULL, pTokenUser->User.Sid, name, &nameLen, domain, &domainLen, &snu)) {
            owner = WideToUtf8(wstring(domain) + L"\\" + wstring(name));
        }

        CloseHandle(hToken);
        return owner;
    }

    int getPid(const KeyPropertiesMap & keyProperties) const {
        // string handleStr = keyProperties.at("Handle");
        string handleStr = get_Handle(keyProperties);
        int pid = 0;
        try {
            pid = std::stoi(handleStr);
        } catch (const std::invalid_argument& e) {
            cerr << "Invalid argument for PID conversion: " << e.what() << std::endl;
            throw; // Rethrow the exception to be handled by the caller
        } catch (const std::out_of_range& e) {
            cerr << "PID out of range: " << e.what() << std::endl;
            throw; // Rethrow the exception to be handled by the caller
        }
        return pid;
    }

    string GetExecutablePath(HANDLE hProcess) const {
        if (hProcess != NULL) {
            char pathBuffer[MAX_PATH];
            if (GetModuleFileNameExA(hProcess, NULL, pathBuffer, MAX_PATH) != 0) {
                return pathBuffer;
            } else {
                throw runtime_error("GetModuleFileNameExA failed for PID. Error: " + to_string(GetLastError()));
            }
        } else {
            throw runtime_error("OpenProcess failed for PID. Error: " + to_string(GetLastError()));
        }
    }

    vector<string> GetLibraries(HANDLE hProcess) const {
        vector<string> libraries;
        HMODULE hMods[1024];
        DWORD cbNeeded;
        if (EnumProcessModules(hProcess, hMods, sizeof(hMods), &cbNeeded)) {
            for (unsigned int i = 0; i < (cbNeeded / sizeof(HMODULE)); i++) {
                char szModName[MAX_PATH];
                if (GetModuleFileNameExA(hProcess, hMods[i], szModName, sizeof(szModName) / sizeof(char))) {
                    libraries.push_back(szModName);
                }
            }
        } else {
            cerr << "EnumProcessModules failed for PID. Error: " << GetLastError() << endl;
        }
        return libraries;
    }

    WmiClass::ReferencesResult GetProcessExecutableReferences(int pid) const {
        WmiClass::ReferencesResult result;
        std::cout << "Getting executable and libraries for PID: " << pid << std::endl;
        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
        std::cout << "Getting executable and libraries for PID: after OpenProcess " << pid << std::endl;
        if (hProcess != NULL) { 
            string executablePath = GetExecutablePath(hProcess);
            std::cout << "Adding reference for executable: " << executablePath << std::endl;
            result.push_back({"CIM_ProcessExecutable", executablePath, "CIM_DataFile.Name='" + executablePath + "'"});

            auto libraries = GetLibraries(hProcess);
            for (const auto& lib : libraries) {
                std::cout << "Adding reference for library: " << lib << std::endl;
                result.push_back({"CIM_ProcessExecutable", lib, "CIM_DataFile.Name='" + lib + "'"});
            }
            CloseHandle(hProcess);
        } else {
            std::cout << "OpenProcess failed for PID: " << pid << ". Error: " << GetLastError() << std::endl;
        }

        return result;
    }

public:
    WmiClass::EntityResult GetEntity(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        WmiClass::EntityResult result;
        int pid = getPid(keyProperties);

        result["Handle"] = pid;
        result["ProcessId"] = pid;
        // --- Calculate ExecutablePath and Name ---
        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
        if (hProcess != NULL) {
            char pathBuffer[MAX_PATH];
            if (GetModuleFileNameExA(hProcess, NULL, pathBuffer, MAX_PATH) != 0) {
                string executablePath = pathBuffer;
                result["ExecutablePath"] = executablePath;

                // Extract process name from path
                size_t lastSlash = executablePath.find_last_of("\\/");
                string processName = (lastSlash == string::npos) ? executablePath : executablePath.substr(lastSlash + 1);
                result["Name"] = processName;

                // --- Get Real CommandLine ---
                string cmdLine = GetCommandLineInternal(hProcess);
                result["CommandLine"] = cmdLine.empty() ? executablePath : cmdLine;

                // --- Get Real Owner ---
                string owner = GetOwnerInternal(hProcess);
                if (!owner.empty()) result["Owner"] = owner;
            } else {
                // Failed to get module file name
                cerr << "GetModuleFileNameExA failed for PID " << pid << ". Error: " << GetLastError() << endl;
                result["ExecutablePath"] = "Unknown Path (Error: " + to_string(GetLastError()) + ")";
                result["Name"] = "Unknown Process";
            }
            CloseHandle(hProcess);
        } else {
            // Failed to open process
            cerr << "OpenProcess failed for PID " << pid << ". Error: " << GetLastError() << endl;
            result["ExecutablePath"] = "Process Not Found or Access Denied (Error: " + to_string(GetLastError()) + ")";
            result["Name"] = "Process Not Found";
        }

        // Final fallback if CommandLine was never set due to OpenProcess failure
        if (result.find("CommandLine") == result.end()) {
            result["CommandLine"] = "Unknown Command Line";
        }

        // Final fallback if Owner was not retrieved (e.g. OpenProcess failed or GetOwnerInternal failed)
        if (result.find("Owner") == result.end()) {
            result["Owner"] = (pid == 4 || pid == 0) ? "NT AUTHORITY\\SYSTEM" : "Unknown / Access Denied";
        }

        return result;
    }


    WmiClass::ReferencesResult GetReferences(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        WmiClass::ReferencesResult result;
        int pid = getPid(keyProperties);
        std::cout << "Getting references for PID: " << pid << std::endl;

        auto resultCIM_ProcessExecutable = GetProcessExecutableReferences(pid);
        result.insert(result.end(), resultCIM_ProcessExecutable.begin(), resultCIM_ProcessExecutable.end());
/*
  {
    "AssocClass": "CIM_ProcessExecutable",
    "Name": "C:\\WINDOWS\\system32\\uxtheme.dll",
    "Moniker": "CIM_DataFile.Name='C:\\WINDOWS\\system32\\uxtheme.dll'"
  },

    struct ReferencesEntry {
        std::string AssocClass;
        std::string Name;
        std::string Moniker;
    };

    typedef std::vector<ReferencesEntry> ReferencesResult;

  */

        return result;
    }
};

static Win32_Process g_win32Process;