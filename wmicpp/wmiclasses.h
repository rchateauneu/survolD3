#pragma once

#include <string>
#include <map>
#include <unordered_map>
#include <variant>
#include <iostream>
#include <strstream>

typedef std::map<std::string, std::string> KeyPropertiesMap;

#include "wmidefinitions.h"

class WmiClass {
public:
    typedef std::map<std::string, std::variant<int, std::string>> EntityResult;

    /*
    {
        "AssocClass": "CIM_ProcessExecutable",
        "Name": "C:\\WINDOWS\\System32\\combase.dll",
        "Moniker": "CIM_DataFile.Name='C:\\WINDOWS\\System32\\combase.dll'"
    },
    */
    struct ReferencesEntry {
        std::string AssocClass;
        std::string Name;
        std::string Moniker;
    };

    struct AssociatorsEntry {
        std::string AssocClass;
        std::string Name;
        std::string Moniker;
    };

    typedef std::vector<ReferencesEntry> ReferencesResult;
    typedef std::vector<AssociatorsEntry> AssociatorsResult;

    virtual const char * GetClassName() const = 0;

    virtual AssociatorsResult GetAssociators(const std::string & wmiNamespace, const std::string & wmiClassname, const KeyPropertiesMap & keyProperties) const {
        return AssociatorsResult();
    }

    virtual ReferencesResult GetReferences(const std::string & wmiNamespace, const std::string & wmiClassname, const KeyPropertiesMap & keyProperties) const {
        return ReferencesResult();
    }

    virtual EntityResult GetEntity(const std::string & wmiNamespace, const std::string & wmiClassname, const KeyPropertiesMap & keyProperties) const {
        return EntityResult();
    }
};

class WmiClassRegister {
public:
    void Register(const WmiClass * wmiClass) {
        std::cout << "Registering WMI class: " << wmiClass->GetClassName() << std::endl;
        dictClasses()[wmiClass->GetClassName()] = wmiClass;
    }

    WmiClass::AssociatorsResult GetAssociatorsRegistered(const std::string & wmiNamespace, const std::string & wmiClassname, const KeyPropertiesMap & keyProperties) const {
        WmiClass::AssociatorsResult result;
        auto it = dictClasses().find(wmiClassname);
        if (it != dictClasses().end()) {
            std::cout << "Found WMI class for associators: " << wmiClassname << std::endl;
            return it->second->GetAssociators(wmiNamespace, wmiClassname, keyProperties);
        } else {
            std::cout << "WMI class not found for associators: " << wmiClassname << std::endl;
            return result;
        }
    }

    WmiClass::ReferencesResult GetReferencesRegistered(const std::string & wmiNamespace, const std::string & wmiClassname, const KeyPropertiesMap & keyProperties) const {
        WmiClass::ReferencesResult result;
        auto it = dictClasses().find(wmiClassname);
        if (it != dictClasses().end()) {
            std::cout << "Found WMI class for references: " << wmiClassname << std::endl;
            return it->second->GetReferences(wmiNamespace, wmiClassname, keyProperties);
        } else {
            std::cout << "WMI class not found for references: " << wmiClassname << std::endl;
            return result;
        }
    }

    WmiClass::EntityResult GetEntityRegistered(const std::string & wmiNamespace, const std::string & wmiClassname, const KeyPropertiesMap & keyProperties) const {
        WmiClass::EntityResult result;
        auto it = dictClasses().find(wmiClassname);
        if (it != dictClasses().end()) {
            std::cout << "Found WMI class: " << wmiClassname << std::endl;
            result = it->second->GetEntity(wmiNamespace, wmiClassname, keyProperties);
        } else {
            std::cout << "WMI class not found: " << wmiClassname << std::endl;
            return result;
        }

        std::string captionValue = wmiNamespace + "," + wmiClassname;
        for (const auto& pair : keyProperties) {
            captionValue += "," + pair.second;
        }
        result["Caption"] = captionValue;
        result["Description"] = wmiClassname;

        return result;
    } 

private:
    std::unordered_map<std::string, const WmiClass *> & dictClasses() const {
        static std::unordered_map<std::string, const WmiClass *> classes;
        return classes;
    }
};

static WmiClassRegister g_wmiClassRegister;

template <typename Derived>
class WmiClassTemplate : public WmiClass, public WmiClassDefinition<Derived> {
public:
    WmiClassTemplate() : WmiClass() {
        //cout << "WmiClassTemplate constructor called for class: " << GetClassName() << endl;
        g_wmiClassRegister.Register(this); // Register the derived class instance
        std::cout << "WmiClassTemplate constructor called for class: " << GetClassName() << std::endl;
    }

    virtual const char * GetClassName() const override {
        return Derived::GetClassNameStatic();
    }

};
