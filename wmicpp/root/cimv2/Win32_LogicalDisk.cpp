#include <string>
#include <stdexcept>
#include <iostream>
#include <vector>
#include <windows.h>

using std::string;
using std::cout;
using std::endl;
using std::cerr;
using std::wstring;
using std::to_string;
using std::runtime_error;

#include "../../wmiclasses.h"
#include "../../wmiutils.h"

static std::string Hostname() {
    char buffer[MAX_COMPUTERNAME_LENGTH + 1];
    DWORD size = sizeof(buffer);
    GetComputerNameA(buffer, &size);
    return buffer;
}

class Win32_LogicalDisk : public WmiClassTemplate<Win32_LogicalDisk> {
private:
public:
    WmiClass::EntityResult GetEntity(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        WmiClass::EntityResult result;
        std::string deviceId = get_DeviceID(keyProperties);
        //result["Name"] = deviceId;
        //result["Description"] = deviceId;

        return WmiClass::EntityResult{{"Name", deviceId}, {"Description", deviceId}};

        //return result;
    }

    WmiClass::AssociatorsResult GetAssociators(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        //WmiClass::AssociatorsResult result;
        std::string deviceId = get_DeviceID(keyProperties);

        std::string computerName = Hostname();

        std::cout << "Adding associator for computer: " << computerName << std::endl;
       // result.push_back({"Win32_SystemDevices", computerName, "Win32_ComputerSystem.Name='" + computerName + "'"});

        //return result;
        return WmiClass::AssociatorsResult{{"Win32_SystemDevices", computerName, "Win32_ComputerSystem.Name='" + computerName + "'"}};
    }

    WmiClass::ReferencesResult GetReferences(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        WmiClass::ReferencesResult result;
        std::string deviceId = get_DeviceID(keyProperties);

        auto filesVector = getFilesOf(deviceId);
        for (const auto & fileName : filesVector) {
            std::cout << "Adding reference for file: " << fileName << std::endl;

            DWORD dwAttrs = GetFileAttributesW(Utf8ToWide(fileName).c_str());
            if (dwAttrs != INVALID_FILE_ATTRIBUTES) {
                if (dwAttrs & FILE_ATTRIBUTE_DIRECTORY) {
                    result.push_back({"CIM_DirectoryContainsFile", fileName, "CIM_Directory.Name='" + fileName + "'"});
                } else {
                    result.push_back({"CIM_DirectoryContainsFile", fileName, "CIM_DataFile.Name='" + fileName + "'"});
                }
            }
        }

        return result;
    }
};

static Win32_LogicalDisk g_win32LogicalDisk;