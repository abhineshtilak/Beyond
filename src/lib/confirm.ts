import { Alert } from 'react-native';

type Opts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export function confirm({ title, message, confirmLabel = 'Confirm', destructive = false }: Opts): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}
