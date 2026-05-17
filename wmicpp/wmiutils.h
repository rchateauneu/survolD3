#include <string>
#include <vector>

#include <windows.h>

std::wstring Utf8ToWide(const std::string& str);

std::string WideToUtf8(const std::wstring& wstr);

std::vector<std::string> getFilesOf(const std::string & path);
