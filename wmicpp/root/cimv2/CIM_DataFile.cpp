#include <string>
#include <stdexcept>
#include <iostream>
#include <vector>
#include <windows.h>
#include <restartmanager.h>

using std::string;
using std::cout;
using std::endl;
using std::cerr;
using std::to_string;
using std::runtime_error;

#include "../../wmiclasses.h"

#pragma comment(lib, "rstrtmgr.lib")

namespace root::cimv2 {

class CIM_DataFile : public WmiClassTemplate<CIM_DataFile> {
private:
    std::vector<int> getLsOf(const string & path) const {
        std::vector<int> pids;
        DWORD dwSession;
        WCHAR szSessionKey[CCH_RM_SESSION_KEY + 1] = { 0 };

        // Start a Restart Manager session
        if (RmStartSession(&dwSession, 0, szSessionKey) != ERROR_SUCCESS) {
            return pids;
        }

        // Convert UTF-8 path to Wide String for Windows API
        int len = MultiByteToWideChar(CP_UTF8, 0, path.c_str(), -1, NULL, 0);
        if (len > 0) {
            std::wstring wPath(len, 0);
            MultiByteToWideChar(CP_UTF8, 0, path.c_str(), -1, &wPath[0], len);

            LPCWSTR pszFile = wPath.c_str();
            // Register the file as a resource to check
            if (RmRegisterResources(dwSession, 1, &pszFile, 0, NULL, 0, NULL) == ERROR_SUCCESS) {
                DWORD dwReason;
                UINT nProcInfoNeeded = 0;
                UINT nProcInfo = 0;
                RM_PROCESS_INFO* rgphi = NULL;

                // First call to determine the number of processes using the file
                if (RmGetList(dwSession, &nProcInfoNeeded, &nProcInfo, NULL, &dwReason) == ERROR_MORE_DATA) {
                    rgphi = new RM_PROCESS_INFO[nProcInfoNeeded];
                    nProcInfo = nProcInfoNeeded;
                    // Second call to actually get the process list
                    if (RmGetList(dwSession, &nProcInfoNeeded, &nProcInfo, rgphi, &dwReason) == ERROR_SUCCESS) {
                        for (UINT i = 0; i < nProcInfo; i++) {
                            pids.push_back(rgphi[i].Process.dwProcessId);
                        }
                    }
                    delete[] rgphi;
                }
            }
        }

        RmEndSession(dwSession);
        return pids;
    }
public:
    WmiClass::EntityResult GetEntity(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        std::string pathName = get_Name(keyProperties);
    
        return WmiClass::EntityResult{{"Name", pathName}, {"Description", pathName}};
    }

    WmiClass::AssociatorsResult GetAssociators(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        WmiClass::AssociatorsResult result;
        std::string pathName = get_Name(keyProperties);

        size_t lastSlash = pathName.find_last_of("\\/");
        if (lastSlash != string::npos) {
            string parentDir = pathName.substr(0, lastSlash);
            std::cout << "Adding associator for parent directory: " << parentDir << std::endl;
            result.push_back({"CIM_DirectoryContainsFile", parentDir, "CIM_Directory.Name='" + parentDir + "'"});
        }

        return result;
    }

    WmiClass::ReferencesResult GetReferences(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        WmiClass::ReferencesResult result;
        std::string pathName = get_Name(keyProperties);

        auto pidVector = getLsOf(pathName);
        for (int pid : pidVector) {
            std::cout << "Adding reference for PID: " << pid << std::endl;
            result.push_back({"CIM_ProcessExecutable", to_string(pid), "Win32_Process.Handle='" + to_string(pid) + "'"});
        }

        return result;
    }
};

static CIM_DataFile g_cimDataFile;
}
