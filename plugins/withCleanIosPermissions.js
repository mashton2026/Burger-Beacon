const { withInfoPlist } = require("expo/config-plugins");

module.exports = function withCleanIosPermissions(config) {
  return withInfoPlist(config, (config) => {
    // Remove unused permissions
    delete config.modResults.NSMicrophoneUsageDescription;
    delete config.modResults.NSLocationAlwaysUsageDescription;
    delete config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription;
    delete config.modResults.NSCameraUsageDescription;

    return config;
  });
};