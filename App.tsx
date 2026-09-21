import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaperProvider } from 'react-native-paper';
import { RootNavigator } from './src/navigation/RootNavigator';
import { paperTheme } from './src/theme/theme';

export default function App() {
  return (
    <PaperProvider theme={paperTheme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
      <RootNavigator />
      <StatusBar style="dark" />
    </PaperProvider>
  );
}
