export interface INbToolsConfigPHPFormatterPrefs {
  "tab-size": number;
  "indent-shift-width": number;
};

export default interface INbToolsConfig {
  java_bin: string;
  php_formatter_config: INbToolsConfigPHPFormatterPrefs,
  java_custom_args: string;
};
