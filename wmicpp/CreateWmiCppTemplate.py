import wmi

def CreateWmiCppTemplate(file, wmi_namespace, wmi_class_name):
    """
    Lists the properties of a specified WMI class.

    Args:
        file (file): The file to write the template to.
        wmi_namespace (str): The WMI namespace (e.g., "root\\cimv2").
        wmi_class_name (str): The name of the WMI class (e.g., "Win32_Process").
    """
    print(f"Connecting to WMI namespace: {wmi_namespace}")
    try:
        c = wmi.WMI(namespace=wmi_namespace)
        wmi_class = getattr(c, wmi_class_name)

        cpp_namespace = wmi_namespace.replace("\\", "::")

        file.write(
        f"""
        namespace {cpp_namespace} {{
        class {wmi_class_name};
        }}

        template<>
        struct WmiClassDefinition<{cpp_namespace}::{wmi_class_name}> {{
            // Properties of the WMI class '{wmi_class_name}' will be defined here.

            static const char * GetClassNameStatic() {{
                return "{wmi_class_name}";
            }}
        """)

        print(f"Properties for WMI class '{wmi_class_name}' in namespace '{wmi_namespace}':")
        # Access the underlying SWbemObject to inspect property metadata
        for prop in wmi_class.Properties_:
            is_key = False
            try:
                # WMI uses qualifiers to store metadata. The "key" qualifier 
                # identifies properties that uniquely identify an instance.
                prop.Qualifiers_("key")
                is_key = True

                file.write(
            f"""
            std::string get_{prop.Name}(const KeyPropertiesMap & keyProperties) const {{
                return keyProperties.at("{prop.Name}");
            }}
            """)

            except Exception:
                pass
            print(f"- {prop.Name}: Type={prop.CIMType}, IsKey={is_key}")

        file.write(
        f"""
        }}; // End of WmiClassDefinition<{wmi_class_name}>
        """)

    except wmi.WMIError as e:
        print(f"Error accessing WMI class '{wmi_class_name}' in namespace '{wmi_namespace}': {e}")
    except AttributeError:
        print(f"WMI class '{wmi_class_name}' not found in namespace '{wmi_namespace}'.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    output_file = "wmidefinitions.h"
    with open(output_file, "w") as f:
        f.write("""
        #pragma once

        template<class Derived>
        struct WmiClassDefinition {
        };

        """)
        CreateWmiCppTemplate(f, "root\\cimv2", "CIM_DataFile")
        CreateWmiCppTemplate(f, "root\\cimv2", "CIM_Directory")
        CreateWmiCppTemplate(f, "root\\cimv2", "Win32_Process")
        CreateWmiCppTemplate(f, "root\\cimv2", "Win32_LogicalDisk")
        CreateWmiCppTemplate(f, "root\\StandardCimv2", "MSFT_NetTCPConnection")
