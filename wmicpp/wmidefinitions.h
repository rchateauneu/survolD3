
        template<class Derived>
        struct WmiClassDefinition {
        };

        
        class CIM_DataFile;
        template<>
        struct WmiClassDefinition<CIM_DataFile> {
            // Properties of the WMI class 'CIM_DataFile' will be defined here.

            static const char * GetClassNameStatic() {
                return "CIM_DataFile";
            }
        
            std::string get_Name(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("Name");
            }
            
        }; // End of WmiClassDefinition<CIM_DataFile>
        
        class CIM_Directory;
        template<>
        struct WmiClassDefinition<CIM_Directory> {
            // Properties of the WMI class 'CIM_Directory' will be defined here.

            static const char * GetClassNameStatic() {
                return "CIM_Directory";
            }
        
            std::string get_Name(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("Name");
            }
            
        }; // End of WmiClassDefinition<CIM_Directory>
        
        class Win32_Process;
        template<>
        struct WmiClassDefinition<Win32_Process> {
            // Properties of the WMI class 'Win32_Process' will be defined here.

            static const char * GetClassNameStatic() {
                return "Win32_Process";
            }
        
            std::string get_Handle(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("Handle");
            }
            
        }; // End of WmiClassDefinition<Win32_Process>
        
        class Win32_LogicalDisk;
        template<>
        struct WmiClassDefinition<Win32_LogicalDisk> {
            // Properties of the WMI class 'Win32_LogicalDisk' will be defined here.

            static const char * GetClassNameStatic() {
                return "Win32_LogicalDisk";
            }
        
            std::string get_DeviceID(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("DeviceID");
            }
            
        }; // End of WmiClassDefinition<Win32_LogicalDisk>
        