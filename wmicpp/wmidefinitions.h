
        template<class Derived>
        struct WmiClassDefinition {
        };

        
        namespace root::cimv2 {
        class CIM_DataFile;
        }

        template<>
        struct WmiClassDefinition<root::cimv2::CIM_DataFile> {
            // Properties of the WMI class 'CIM_DataFile' will be defined here.

            static const char * GetClassNameStatic() {
                return "CIM_DataFile";
            }
        
            std::string get_Name(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("Name");
            }
            
        }; // End of WmiClassDefinition<CIM_DataFile>
        
        namespace root::cimv2 {
        class CIM_Directory;
        }

        template<>
        struct WmiClassDefinition<root::cimv2::CIM_Directory> {
            // Properties of the WMI class 'CIM_Directory' will be defined here.

            static const char * GetClassNameStatic() {
                return "CIM_Directory";
            }
        
            std::string get_Name(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("Name");
            }
            
        }; // End of WmiClassDefinition<CIM_Directory>
        
        namespace root::cimv2 {
        class Win32_Process;
        }

        template<>
        struct WmiClassDefinition<root::cimv2::Win32_Process> {
            // Properties of the WMI class 'Win32_Process' will be defined here.

            static const char * GetClassNameStatic() {
                return "Win32_Process";
            }
        
            std::string get_Handle(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("Handle");
            }
            
        }; // End of WmiClassDefinition<Win32_Process>
        
        namespace root::cimv2 {
        class Win32_LogicalDisk;
        }

        template<>
        struct WmiClassDefinition<root::cimv2::Win32_LogicalDisk> {
            // Properties of the WMI class 'Win32_LogicalDisk' will be defined here.

            static const char * GetClassNameStatic() {
                return "Win32_LogicalDisk";
            }
        
            std::string get_DeviceID(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("DeviceID");
            }
            
        }; // End of WmiClassDefinition<Win32_LogicalDisk>
        
        namespace root::StandardCimv2 {
        class MSFT_NetTCPConnection;
        }

        template<>
        struct WmiClassDefinition<root::StandardCimv2::MSFT_NetTCPConnection> {
            // Properties of the WMI class 'MSFT_NetTCPConnection' will be defined here.

            static const char * GetClassNameStatic() {
                return "MSFT_NetTCPConnection";
            }
        
            std::string get_InstanceID(const KeyPropertiesMap & keyProperties) const {
                return keyProperties.at("InstanceID");
            }
            
        }; // End of WmiClassDefinition<MSFT_NetTCPConnection>
        