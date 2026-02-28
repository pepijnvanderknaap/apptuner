import { AppRegistry } from 'react-native';
import App from './App';

// AppTuner reads global.App to render the component
global.App = App;

AppRegistry.registerComponent('testApp', () => App);
