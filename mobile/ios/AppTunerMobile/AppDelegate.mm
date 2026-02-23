#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTDevMenu.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"AppTunerMobile";
  self.initialProps = @{};

  BOOL result = [super application:application didFinishLaunchingWithOptions:launchOptions];

  // Disable the default React Native shake-to-show dev menu.
  // AppTuner uses its own shake handler via react-native-shake.
#if DEBUG
  [self.bridge.devMenu setShakeToShow:NO];
#endif

  return result;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
