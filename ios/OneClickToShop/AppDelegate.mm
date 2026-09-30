#import "AppDelegate.h"
#import <Firebase.h>

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  self.moduleName = @"OneClickToShop";
  self.dependencyProvider = [RCTAppDependencyProvider new];

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

#pragma mark - UISceneSession lifecycle

- (UISceneConfiguration *)application:(UIApplication *)application
configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession
                               options:(UISceneConnectionOptions *)options
{
  UISceneConfiguration *sceneConfig = [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
  sceneConfig.delegateClass = [AppDelegate class];
  return sceneConfig;
}

- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }
  UIWindowScene *windowScene = (UIWindowScene *)scene;
  AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
  UIWindow *window = appDelegate.window;
  if (!window) {
    window = self.window;
  }
  if (window) {
    window.windowScene = windowScene;
    self.window = window;
    [window makeKeyAndVisible];
  }
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
