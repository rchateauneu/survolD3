#include <napi.h>
#include <string>
#include <vector>
#include <map>
#include <iostream> // For console logging

// Helper function to extract key-value pairs from a Napi::Object
std::map<std::string, std::string> extractKeyProperties(const Napi::Object& jsObject) {
    std::map<std::string, std::string> keyPropertiesMap;
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

// Placeholder for GetReferences C++ function
Napi::Value GetReferences(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Check argument count
    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Wrong number of arguments. Expected 3: wmiNamespace, wmiClassName, keyProperties").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Extract parameters
    std::string wmiNamespace = info[0].As<Napi::String>().Utf8Value();
    std::string wmiClassName = info[1].As<Napi::String>().Utf8Value();
    Napi::Object keyPropertiesJs = info[2].As<Napi::Object>();
    std::map<std::string, std::string> keyProperties = extractKeyProperties(keyPropertiesJs);

    std::cout << "C++ GetReferences called:" << std::endl;
    std::cout << "  Namespace: " << wmiNamespace << std::endl;
    std::cout << "  Class Name: " << wmiClassName << std::endl;
    std::cout << "  Key Properties:" << std::endl;
    for (const auto& pair : keyProperties) {
        std::cout << "    " << pair.first << ": " << pair.second << std::endl;
    }

    // Return an empty Napi::Array as a placeholder
    return Napi::Array::New(env);
}

// Placeholder for GetAssociators C++ function
Napi::Value GetAssociators(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Wrong number of arguments. Expected 3: wmiNamespace, wmiClassName, keyProperties").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string wmiNamespace = info[0].As<Napi::String>().Utf8Value();
    std::string wmiClassName = info[1].As<Napi::String>().Utf8Value();
    Napi::Object keyPropertiesJs = info[2].As<Napi::Object>();
    std::map<std::string, std::string> keyProperties = extractKeyProperties(keyPropertiesJs);

    std::cout << "C++ GetAssociators called:" << std::endl;
    std::cout << "  Namespace: " << wmiNamespace << std::endl;
    std::cout << "  Class Name: " << wmiClassName << std::endl;
    std::cout << "  Key Properties:" << std::endl;
    for (const auto& pair : keyProperties) {
        std::cout << "    " << pair.first << ": " << pair.second << std::endl;
    }

    return Napi::Array::New(env);
}

// Placeholder for GetEntity C++ function
Napi::Value GetEntity(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Wrong number of arguments. Expected 3: wmiNamespace, wmiClassName, keyProperties").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string wmiNamespace = info[0].As<Napi::String>().Utf8Value();
    std::string wmiClassName = info[1].As<Napi::String>().Utf8Value();
    Napi::Object keyPropertiesJs = info[2].As<Napi::Object>();
    std::map<std::string, std::string> keyProperties = extractKeyProperties(keyPropertiesJs);

    Napi::Object result = Napi::Object::New(env);
    Napi::Array propertiesArray = Napi::Array::New(env);
    uint32_t arrayIndex = 0;

    // Add elements for each key-value pair given as input (the third argument)
    for (const auto& pair : keyProperties) {
        Napi::Object p = Napi::Object::New(env);
        p.Set("Name", Napi::String::New(env, pair.first));
        p.Set("Value", Napi::String::New(env, pair.second));
        p.Set("CimType", Napi::Number::New(env, 14));
        propertiesArray.Set(arrayIndex++, p);
    }

    // Add "Caption" element: concatenation of input values separated with a comma
    std::string captionValue = wmiNamespace + "," + wmiClassName;
    for (const auto& pair : keyProperties) {
        captionValue += "," + pair.second;
    }
    Napi::Object captionProp = Napi::Object::New(env);
    captionProp.Set("Name", Napi::String::New(env, "Caption"));
    captionProp.Set("Value", Napi::String::New(env, captionValue));
    captionProp.Set("CimType", Napi::Number::New(env, 14));
    propertiesArray.Set(arrayIndex++, captionProp);

    // Add "Description" element: the class name
    Napi::Object descProp = Napi::Object::New(env);
    descProp.Set("Name", Napi::String::New(env, "Description"));
    descProp.Set("Value", Napi::String::New(env, wmiClassName));
    descProp.Set("CimType", Napi::Number::New(env, 14));
    propertiesArray.Set(arrayIndex++, descProp);

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