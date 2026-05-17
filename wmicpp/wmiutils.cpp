#include "wmiutils.h"

std::wstring Utf8ToWide(const std::string& str) {
    if (str.empty()) return L"";
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);
    return wstrTo;
}

std::string WideToUtf8(const std::wstring& wstr) {
    if (wstr.empty()) return "";
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
    return strTo;
}

std::vector<std::string> getFilesOf(const std::string & path) {
    std::vector<std::string> files;
    std::string searchPath = path;
    if (!searchPath.empty() && searchPath.back() != '\\' && searchPath.back() != '/') {
        searchPath += "\\";
    }

    std::wstring wSearchPattern = Utf8ToWide(searchPath + "*");
    WIN32_FIND_DATAW findData;
    HANDLE hFind = FindFirstFileW(wSearchPattern.c_str(), &findData);

    if (hFind != INVALID_HANDLE_VALUE) {
        do {
            std::wstring fileName = findData.cFileName;
            if (fileName != L"." && fileName != L"..") {
                files.push_back(searchPath + WideToUtf8(fileName));
            }
        } while (FindNextFileW(hFind, &findData));
        FindClose(hFind);
    }
    return files;
}
