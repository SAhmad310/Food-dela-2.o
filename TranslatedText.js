import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const TranslatedText = ({ 
  path, 
  namespace = 'common', 
  options = {}, 
  className = '',
  tag: Tag = 'span',
  fallback = null
}) => {
  const { t } = useLanguage();
  const text = t(path, namespace, options);

  if (text === path && fallback) {
    return <Tag className={className}>{fallback}</Tag>;
  }

  return <Tag className={className}>{text}</Tag>;
};

export default TranslatedText;