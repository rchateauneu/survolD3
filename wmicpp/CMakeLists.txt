cmake_minimum_required(VERSION 3.28)
project(wmicpp)

# Beware : 

# 1. Get the include directory for node-addon-api by running a node command
# Beware: Later, it prefixes the result with "D:\Developpement\survolD3dev\survolD3\wmicpp\" which is the current working directory, so we need to remove it from the result to get the correct path to napi.h
# D:\Developpement\survolD3dev\survolD3\wmicpp\"D:\Developpement\survolD3dev\survolD3\wmicpp\node_modules\node-addon-api"

#execute_process(COMMAND node -p "require('node-addon-api').include"
#                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
#                OUTPUT_VARIABLE NODE_ADDON_API_DIR
#                OUTPUT_STRIP_TRAILING_WHITESPACE)

# 2. Add the addon target (ensure it's a SHARED library)
add_library(wmicpp SHARED wmicpp.cpp Win32_Process.cpp)

# 3. Configure the output to be a .node file without the 'lib' prefix (standard for Node addons)
set_target_properties(wmicpp PROPERTIES PREFIX "" SUFFIX ".node")

# 4. Include the headers: 
# CMAKE_JS_INC is automatically provided by cmake-js for Node.js core headers
# NODE_ADDON_API_DIR is what we just found for napi.h
# target_include_directories(wmicpp PRIVATE ${NODE_ADDON_API_DIR} ${CMAKE_JS_INC})
target_include_directories(wmicpp PRIVATE "node_modules/node-addon-api" ${CMAKE_JS_INC})

# 5. Link against Node.js libraries (provided by cmake-js)
target_link_libraries(wmicpp ${CMAKE_JS_LIB})

# 6. (Optional but Recommended) Enable C++17 and Addon Exceptions
# Node-addon-api v7+ generally requires C++17.
set_target_properties(wmicpp PROPERTIES CXX_STANDARD 23)
set_target_properties(wmicpp PROPERTIES CXX_STANDARD_REQUIRED ON)
target_compile_definitions(wmicpp PRIVATE NAPI_CPP_EXCEPTIONS)
