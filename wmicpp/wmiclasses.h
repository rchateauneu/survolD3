#pragma once

#include <string>
#include <map>
#include <unordered_map>
#include <variant>
#include <iostream>

class WmiClass {
public:
    typedef std::map<std::string, std::variant<int, std::string>> EntityResult;
    virtual EntityResult GetEntity(const std::string & wmiNamespace, const std::string & wmiClassname, const std::map<std::string, std::string> & keyProperties) const = 0;

    virtual const char * GetClassName() const = 0;
};


class WmiClassRegister {
public:
    void Register(const WmiClass * wmiClass) {
        std::cout << "Registering WMI class: " << wmiClass->GetClassName() << std::endl;
        dictClasses()[wmiClass->GetClassName()] = wmiClass;
    }

    WmiClass::EntityResult GetEntityCommon(const std::string & wmiNamespace, const std::string & wmiClassname, const std::map<std::string, std::string> & keyProperties) const {
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
class WmiClassTemplate : public WmiClass {
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
