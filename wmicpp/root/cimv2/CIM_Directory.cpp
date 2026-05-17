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

namespace root::cimv2 {

class CIM_Directory : public WmiClassTemplate<CIM_Directory> {
public:
    WmiClass::EntityResult GetEntity(const string & wmiNamespace, const string & wmiClassname, const KeyPropertiesMap & keyProperties) const override {
        //WmiClass::EntityResult result;
        std::string pathName = get_Name(keyProperties);
        //result["Name"] = pathName;
        //result["Description"] = pathName;

        //return result;
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

        auto filesVector = getFilesOf(pathName);
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

static CIM_Directory g_cimDirectory;

}
