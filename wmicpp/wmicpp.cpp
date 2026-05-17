#include <string>
#include <vector>
#include <map>
#include <variant>
#include <iostream> // For console logging

#include <napi.h>
#include "wmiclasses.h"
//#include "Win32_Process.h"

// Helper function to extract key-value pairs from a Napi::Object
static KeyPropertiesMap extractKeyProperties(const Napi::Object& jsObject) {
    KeyPropertiesMap keyPropertiesMap;
    Napi::Array propertyNames = jsObject.GetPropertyNames();

    for (uint32_t i = 0; i < propertyNames.Length(); i++) {
        Napi::String key = propertyNames.Get(i).As<Napi::String>();
        Napi::Value value = jsObject.Get(key);

        // Convert Napi::Value to string for now. In a real implementation,
        // you'd handle different Napi::Value types (Number, Boolean, etc.) appropriately.
        keyPropertiesMap[key.Utf8Value()] = value.ToString().Utf8Value();
    }
    return keyPropertiesMap;
}

static auto Napi2Tuple(const Napi::CallbackInfo& info) {
    std::tuple<std::string, std::string, KeyPropertiesMap> result;
    if (info.Length() < 3) {
        Napi::TypeError::New(info.Env(), "Wrong number of arguments. Expected 3: wmiNamespace, wmiClassName, keyProperties").ThrowAsJavaScriptException();
    }

    std::string wmiNamespace = info[0].As<Napi::String>().Utf8Value();
    std::string wmiClassName = info[1].As<Napi::String>().Utf8Value();
    Napi::Object keyPropertiesJs = info[2].As<Napi::Object>();
    KeyPropertiesMap keyProperties = extractKeyProperties(keyPropertiesJs);

    return std::make_tuple(wmiNamespace, wmiClassName, keyProperties);
}

static void appendToNapiArray(const Napi::Env& env, Napi::Array& propertiesArray, const std::string & name, const std::variant<int, std::string> & value) {
    uint32_t arrayIndex = propertiesArray.Length();
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("Name", Napi::String::New(env, name));

    std::visit([&](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, int>) {
            obj.Set("Value", Napi::Number::New(env, arg));
            obj.Set("CimType", Napi::Number::New(env, 8)); // Assuming 8 represents integer type in CIM
        } else if constexpr (std::is_same_v<T, std::string>) {
            obj.Set("Value", Napi::String::New(env, arg));
            obj.Set("CimType", Napi::Number::New(env, 14));
        }
        std::cout << "  Added property: " << name << " = " << arg << std::endl;
    }, value);

    propertiesArray.Set(arrayIndex++, obj);
}

static Napi::Array dictToNapiArray(const Napi::Env& env, const WmiClass::EntityResult& dict) {
    Napi::Array propertiesArray = Napi::Array::New(env);
    for (const auto& pair : dict) {
        appendToNapiArray(env, propertiesArray, pair.first, pair.second);
    }
    return propertiesArray;
}

// Placeholder for GetEntity C++ function
Napi::Value GetEntity(const Napi::CallbackInfo& info) {
    std::cout << "C++ GetEntity called:" << std::endl;
    Napi::Env env = info.Env();

    auto [wmiNamespace, wmiClassName, keyProperties] = Napi2Tuple(info);

    std::optional<WmiClass::EntityResult> resultDict = g_wmiClassRegister.GetEntityRegistered(wmiNamespace, wmiClassName, keyProperties);
    if(!resultDict.has_value()) {
        std::cout << "No information found for the given class and key properties." << std::endl;
        return env.Null();
    }

    Napi::Array propertiesArray = dictToNapiArray(env, resultDict.value());

    Napi::Object result = Napi::Object::New(env);
    result.Set("CimInstanceProperties", propertiesArray);
    return result;
}

// Placeholder for GetAssociators C++ function
Napi::Value GetAssociators(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto [wmiNamespace, wmiClassName, keyProperties] = Napi2Tuple(info);

    std::cout << "C++ GetAssociators called:" << std::endl;
    std::cout << "  Namespace: " << wmiNamespace << std::endl;
    std::cout << "  Class Name: " << wmiClassName << std::endl;
    std::cout << "  Key Properties:" << std::endl;
    for (const auto& pair : keyProperties) {
        std::cout << "    " << pair.first << ": " << pair.second << std::endl;
    }

    std::optional<WmiClass::AssociatorsResult> resultDict = g_wmiClassRegister.GetAssociatorsRegistered(wmiNamespace, wmiClassName, keyProperties);
    if(!resultDict.has_value()) {
        std::cout << "No associators found for the given class and key properties." << std::endl;
        return env.Null();
    }

    Napi::Array propertiesArray = Napi::Array::New(env);
    for(const auto & assoc : resultDict.value()) {
        /*
        {
            "AssocClass": "CIM_ProcessExecutable",
            "Name": "C:\\WINDOWS\\system32\\mswsock.dll",
            "Moniker": "CIM_DataFile.Name='C:\\WINDOWS\\system32\\mswsock.dll'"
        },
        */
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("AssocClass", Napi::String::New(env, assoc.AssocClass));
        obj.Set("Name", Napi::String::New(env, assoc.Name));
        obj.Set("Moniker", Napi::String::New(env, assoc.Moniker));
        propertiesArray.Set(propertiesArray.Length(), obj);
    }

    Napi::Value result = propertiesArray;
    return result;
}

// Placeholder for GetReferences C++ function
Napi::Value GetReferences(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto [wmiNamespace, wmiClassName, keyProperties] = Napi2Tuple(info);

    std::cout << "C++ GetReferences called:" << std::endl;
    std::cout << "  Namespace: " << wmiNamespace << std::endl;
    std::cout << "  Class Name: " << wmiClassName << std::endl;
    std::cout << "  Key Properties:" << std::endl;
    for (const auto& pair : keyProperties) {
        std::cout << "    " << pair.first << ": " << pair.second << std::endl;
    }

    std::optional<WmiClass::ReferencesResult> resultDict = g_wmiClassRegister.GetReferencesRegistered(wmiNamespace, wmiClassName, keyProperties);
    if(!resultDict.has_value()) {
        std::cout << "No references found for the given class and key properties." << std::endl;
        return env.Null();
    }

    Napi::Array propertiesArray = Napi::Array::New(env);
    for(const auto & assoc : resultDict.value()) {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("AssocClass", Napi::String::New(env, assoc.AssocClass));
        obj.Set("Name", Napi::String::New(env, assoc.Name));
        obj.Set("Moniker", Napi::String::New(env, assoc.Moniker));
        propertiesArray.Set(propertiesArray.Length(), obj);
    }

/*
  {
    "AssocClass": "CIM_ProcessExecutable",
    "Name": "C:\\WINDOWS\\system32\\mswsock.dll",
    "Moniker": "CIM_DataFile.Name='C:\\WINDOWS\\system32\\mswsock.dll'"
  },
*/

    Napi::Value result = propertiesArray;
    return result;
}


Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "GetReferences"), Napi::Function::New(env, GetReferences));
    exports.Set(Napi::String::New(env, "GetAssociators"), Napi::Function::New(env, GetAssociators));
    exports.Set(Napi::String::New(env, "GetEntity"), Napi::Function::New(env, GetEntity));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)