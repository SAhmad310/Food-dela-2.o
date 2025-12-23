import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FiGlobe, FiChevronDown, FiCheck } from 'react-icons/fi';

const LanguageSelector = ({ compact = false }) => {
  const { language, supportedLanguages, changeLanguage, getCurrentLanguageInfo } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = getCurrentLanguageInfo();

  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <span className="text-xl">{currentLanguage.flag}</span>
          <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg z-50 py-2">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{lang.flag}</span>
                    <div className="text-left">
                      <div className="font-medium">{lang.nativeName}</div>
                      <div className="text-sm text-gray-500">{lang.name}</div>
                    </div>
                  </div>
                  {language === lang.code && (
                    <FiCheck className="text-primary" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
      >
        <div className="flex items-center space-x-3">
          <FiGlobe className="text-xl text-gray-600" />
          <div className="text-left">
            <div className="font-semibold">{currentLanguage.nativeName}</div>
            <div className="text-sm text-gray-500">Language</div>
          </div>
        </div>
        <FiChevronDown className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">Select Language</h3>
              <p className="text-gray-600 text-sm">Choose your preferred language</p>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition ${
                    language === lang.code ? 'bg-primary bg-opacity-5' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-4">{lang.flag}</span>
                    <div className="text-left">
                      <div className="font-semibold">{lang.nativeName}</div>
                      <div className="text-sm text-gray-500">{lang.name}</div>
                    </div>
                  </div>
                  
                  {language === lang.code ? (
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <FiCheck className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300"></div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-500">
                Some features may not be fully translated
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;