#include <string>
#include <vector>
#include <map>
#include <variant>
#include <iostream> // For console logging

#include <napi.h>
#include "wmiclasses.h"
#include "Win32_Process.h"

using namespace std;

// Helper function to extract key-value pairs from a Napi::Object
map<string, string> extractKeyProperties(const Napi::Object& jsObject) {
    map<string, string> keyPropertiesMap;
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

auto Napi2Tuple(const Napi::CallbackInfo& info) {
    tuple<string, string, map<string, string>> result;
    if (info.Length() < 3) {
        Napi::TypeError::New(info.Env(), "Wrong number of arguments. Expected 3: wmiNamespace, wmiClassName, keyProperties").ThrowAsJavaScriptException();
    }

    string wmiNamespace = info[0].As<Napi::String>().Utf8Value();
    string wmiClassName = info[1].As<Napi::String>().Utf8Value();
    Napi::Object keyPropertiesJs = info[2].As<Napi::Object>();
    map<string, string> keyProperties = extractKeyProperties(keyPropertiesJs);

    return std::make_tuple(wmiNamespace, wmiClassName, keyProperties);
}

// Placeholder for GetReferences C++ function
Napi::Value GetReferences(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto [wmiNamespace, wmiClassName, keyProperties] = Napi2Tuple(info);

    cout << "C++ GetReferences called:" << endl;
    cout << "  Namespace: " << wmiNamespace << endl;
    cout << "  Class Name: " << wmiClassName << endl;
    cout << "  Key Properties:" << endl;
    for (const auto& pair : keyProperties) {
        cout << "    " << pair.first << ": " << pair.second << endl;
    }

    // Return an empty Napi::Array as a placeholder
    return Napi::Array::New(env);
}

// Placeholder for GetAssociators C++ function
Napi::Value GetAssociators(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto [wmiNamespace, wmiClassName, keyProperties] = Napi2Tuple(info);

    cout << "C++ GetAssociators called:" << endl;
    cout << "  Namespace: " << wmiNamespace << endl;
    cout << "  Class Name: " << wmiClassName << endl;
    cout << "  Key Properties:" << endl;
    for (const auto& pair : keyProperties) {
        cout << "    " << pair.first << ": " << pair.second << endl;
    }

    return Napi::Array::New(env);
}

void appendToNapiArray(const Napi::Env& env, Napi::Array& propertiesArray, const string & name, const variant<int, string> & value) {
    uint32_t arrayIndex = propertiesArray.Length();
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("Name", Napi::String::New(env, name));

    std::visit([&](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, int>) {
            obj.Set("Value", Napi::Number::New(env, arg));
            obj.Set("CimType", Napi::Number::New(env, 8)); // Assuming 8 represents integer type in CIM
        } else if constexpr (std::is_same_v<T, string>) {
            obj.Set("Value", Napi::String::New(env, arg));
            obj.Set("CimType", Napi::Number::New(env, 14));
        }
        cout << "  Added property: " << name << " = " << arg << endl;
    }, value);

    propertiesArray.Set(arrayIndex++, obj);
}

static auto dictToNapiArray(const Napi::Env& env, const WmiClass::EntityResult& dict) {
    Napi::Array propertiesArray = Napi::Array::New(env);
    for (const auto& pair : dict) {
        appendToNapiArray(env, propertiesArray, pair.first, pair.second);
    }
    return propertiesArray;
}

// Placeholder for GetEntity C++ function
Napi::Value GetEntity(const Napi::CallbackInfo& info) {
    cout << "C++ GetEntity called:" << endl;
    Napi::Env env = info.Env();

    auto [wmiNamespace, wmiClassName, keyProperties] = Napi2Tuple(info);

    auto resultDict = g_wmiClassRegister.GetEntityCommon(wmiNamespace, wmiClassName, keyProperties);

    Napi::Array propertiesArray = dictToNapiArray(env, resultDict);

    Napi::Object result = Napi::Object::New(env);
    result.Set("CimInstanceProperties", propertiesArray);
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "GetReferences"), Napi::Function::New(env, GetReferences));
    exports.Set(Napi::String::New(env, "GetAssociators"), Napi::Function::New(env, GetAssociators));
    exports.Set(Napi::String::New(env, "GetEntity"), Napi::Function::New(env, GetEntity));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)