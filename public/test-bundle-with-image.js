// Manual Bundle with Image Support
// This bundle includes base64-encoded image data

(function() {
  console.log('[Manual Bundle] Starting with image support...');

  const React = this.React;
  const ReactNative = this.ReactNative;
  const { View, Text, StyleSheet, TouchableOpacity, Image } = ReactNative;

  // Base64 encoded logo.png (the same one from test-app/assets)
  const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMTgtMDItMjhUMTY6MDM6MDUtMDg6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDE4LTAyLTI4VDE2OjA4OjM1LTA4OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDE4LTAyLTI4VDE2OjA4OjM1LTA4OjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjU5YzQxZjQyLTBkMTItNGQ4OS1hNGM3LWU4YmQ5MTU1YjgxMyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo1OWM0MWY0Mi0wZDEyLTRkODktYTRjNy1lOGJkOTE1NWI4MTMiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo1OWM0MWY0Mi0wZDEyLTRkODktYTRjNy1lOGJkOTE1NWI4MTMiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjU5YzQxZjQyLTBkMTItNGQ4OS1hNGM3LWU4YmQ5MTU1YjgxMyIgc3RFdnQ6d2hlbj0iMjAxOC0wMi0yOFQxNjowMzowNS0wODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKE1hY2ludG9zaCkiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Af/+/fz7+vn49/b19PPy8fDv7u3s6+rp6Ofm5eTj4uHg397d3Nva2djX1tXU09LR0M/OzczLysnIx8bFxMPCwcC/vr28u7q5uLe2tbSzsrGwr66trKuqqainpqWko6KhoJ+enZybmpmYl5aVlJOSkZCPjo2Mi4qJiIeGhYSDgoGAf359fHt6eXh3dnV0c3JxcG9ubWxramloZ2ZlZGNiYWBfXl1cW1pZWFdWVVRTUlFQT05NTEtKSUhHRkVEQ0JBQD8+PTw7Ojk4NzY1NDMyMTAvLi0sKyopKCcmJSQjIiEgHx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQAAIfkEAQAAAQAsAAAAAGQAZAAAAv+Ej6nL7Q+jnLTai7PevPsPhuJIluaJpurKtu4Lx/JM1/aN5/rO9/4PDAqHxKLxiEwql8ym8wmNSqfUrvcLjkqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8v/8PGCg4SFhoeIiYqLjI2Oj4CBkpOUlZaXmJmam5ydnp+QkaKjpKWmp6ipqqusra6voKGys7S1tre4ubq7vL2+v7CxwsPExcbHyMnKy8zNzs/AwdLT1NXW19jZ2tvc3d7f0NHi4+Tl5ufo6err7O3u7+Dh8vP09fb3+Pn6+/z9/v/w8woMCBBAsaPIgwocKFDBs6fAgxosSJFCtavIgxo8aN';

  function App() {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
      console.log('🚀 Manual bundle with image mounted!');
    }, []);

    const handleIncrement = () => {
      console.log('➕ Incrementing counter');
      setCount(count + 1);
    };

    const handleReset = () => {
      console.warn('⚠️ Resetting counter to 0');
      setCount(0);
    };

    return React.createElement(View, { style: styles.container },
      React.createElement(Image, {
        source: { uri: `data:image/png;base64,${logoBase64}` },
        style: styles.logo
      }),
      React.createElement(Text, { style: styles.title }, '🎨 IMAGE WORKING! 🎨'),
      React.createElement(Text, { style: styles.subtitle }, 'Manual bundle + Base64 image = Success!'),
      React.createElement(View, { style: styles.counterBox },
        React.createElement(Text, { style: styles.counterLabel }, 'Counter:'),
        React.createElement(Text, { style: styles.counterValue }, count.toString())
      ),
      React.createElement(TouchableOpacity, { style: styles.button, onPress: handleIncrement },
        React.createElement(Text, { style: styles.buttonText }, 'Tap to Increment')
      ),
      React.createElement(TouchableOpacity, { style: [styles.button, styles.resetButton], onPress: handleReset },
        React.createElement(Text, { style: styles.buttonText }, 'Reset')
      )
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#1a1a1a',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 20,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: '#aaa',
      marginBottom: 30,
      textAlign: 'center',
    },
    counterBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      padding: 20,
      backgroundColor: '#2a2a2a',
      borderRadius: 10,
    },
    counterLabel: {
      fontSize: 18,
      color: '#fff',
      marginRight: 10,
    },
    counterValue: {
      fontSize: 32,
      color: '#4CAF50',
      fontWeight: 'bold',
    },
    button: {
      backgroundColor: '#4CAF50',
      padding: 15,
      borderRadius: 10,
      width: 200,
      marginTop: 10,
    },
    resetButton: {
      backgroundColor: '#FF3B30',
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  this.App = App;
  console.log('[Manual Bundle] App with image ready!');
}.call(this));
