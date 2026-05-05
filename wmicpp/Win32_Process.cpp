#pragma once

#include <string>

#include "wmiclasses.h"
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

class Win32_Process : public WmiClassTemplate<Win32_Process> {
private:
    /**
     * Helper to retrieve the command line of another process by walking its PEB.
     */
    static std::string GetCommandLineInternal(HANDLE hProcess) {
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

        std::vector<wchar_t> buffer(params.CommandLine.Length / sizeof(wchar_t) + 1, 0);
        if (!ReadProcessMemory(hProcess, params.CommandLine.Buffer, buffer.data(), params.CommandLine.Length, &bytesRead)) {
            return "";
        }

        return WideToUtf8(buffer.data());
    }

    /**
     * Helper to convert Windows Wide strings to UTF-8 std::string
     */
    static std::string WideToUtf8(const std::wstring& wstr) {
        if (wstr.empty()) return "";
        int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
        std::string strTo(size_needed, 0);
        WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
        return strTo;
    }

public:
    WmiClass::EntityResult GetEntity(const std::string & wmiNamespace, const std::string & wmiClassname, const std::map<std::string, std::string> & keyProperties) const override {
        WmiClass::EntityResult result;
        // Extract PID from keyProperties
        std::string handleStr = keyProperties.at("Handle");
        int pid = 0;
        try {
            pid = std::stoi(handleStr);
        } catch (const std::invalid_argument& e) {
            std::cerr << "Invalid argument for PID conversion: " << e.what() << std::endl;
            // In a real application, you might throw an exception or return an error object.
            return result;
        } catch (const std::out_of_range& e) {
            std::cerr << "PID out of range: " << e.what() << std::endl;
            // In a real application, you might throw an exception or return an error object.
            return result;
        }

        result["Handle"] = pid;
        result["ProcessId"] = pid;
        // --- Calculate ExecutablePath and Name ---
        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
        if (hProcess != NULL) {
            char pathBuffer[MAX_PATH];
            if (GetModuleFileNameExA(hProcess, NULL, pathBuffer, MAX_PATH) != 0) {
                std::string executablePath = pathBuffer;
                result["ExecutablePath"] = executablePath;

                // Extract process name from path
                size_t lastSlash = executablePath.find_last_of("\\/");
                std::string processName = (lastSlash == std::string::npos) ? executablePath : executablePath.substr(lastSlash + 1);
                result["Name"] = processName;

                // --- Get Real CommandLine ---
                std::string cmdLine = GetCommandLineInternal(hProcess);
                result["CommandLine"] = cmdLine.empty() ? executablePath : cmdLine;
            } else {
                // Failed to get module file name
                std::cerr << "GetModuleFileNameExA failed for PID " << pid << ". Error: " << GetLastError() << std::endl;
                result["ExecutablePath"] = "Unknown Path (Error: " + std::to_string(GetLastError()) + ")";
                result["Name"] = "Unknown Process";
            }
            CloseHandle(hProcess);
        } else {
            // Failed to open process
            std::cerr << "OpenProcess failed for PID " << pid << ". Error: " << GetLastError() << std::endl;
            result["ExecutablePath"] = "Process Not Found or Access Denied (Error: " + std::to_string(GetLastError()) + ")";
            result["Name"] = "Process Not Found";
        }

        // Final fallback if CommandLine was never set due to OpenProcess failure
        if (result.find("CommandLine") == result.end()) {
            result["CommandLine"] = "Unknown Command Line";
        }

        // --- Owner: More sophisticated placeholder ---
        // Retrieving the process owner also involves several complex WinAPI calls.
        // This would typically be a direct WMI property.
        result["Owner"] = (pid == 4 || pid == 0) ? "NT AUTHORITY\\SYSTEM" : "CURRENT_USER"; // Simple heuristic for common system PIDs

        return result;
    }

    static const char * GetClassNameStatic() {
        return "Win32_Process";
    }
};

static Win32_Process g_win32Process;