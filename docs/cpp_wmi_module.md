I want to add to this project a module written in C++ which can be built with CMake. It will have three functions :
- GetReferences (same behaviour and parameters as in wmi\WMI_Entity.js)
- GetAssociators (same behaviour and parameters as in wmi\WMI_References.js)
- GetAssociators (same behaviour and parameters as in wmi\WMI_Associators.js)
- GetEntity (same behaviour and parameters as in WMI_Entity.js)

These three existing functions will first try to load the library, and of not, will fallback to the existing javascript code.

This new module, named wmicpp, must be stored in its own dorectory and must be built with a CMake file.
It must use the library Node-API and the header file napi.h
It should ideally tale into account different processor architectures, but x86-64 is OK.
It must use CMake-js as a build system.

Do not implement in C++ the three functions GetReferences, GetAssociators, and GetEntity.
This will me made later. Just return an empty result.
All the new files must be stored in a directory named wmicpp at the root of the project.
This library can be built independently.
In the CMake file, there must be code to install the new module and replace the previous version.

In the three existing files wmi\WMI_References.js, wmi\WMI_Associators.js, wmi\WMI_Entity.js create three new functions
named GetReferencesCPP, GetAssociatorsCPP, and GetEntityCPP, with the same signature as
GetReferences, GetAssociators, and GetEntity.
These three functions must load the new module.


