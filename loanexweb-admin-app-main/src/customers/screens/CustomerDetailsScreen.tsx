import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MOCK_CUSTOMERS } from '../data/mockData';
import { CustomerDetailView } from '../components/CustomerDetailView';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetails'>;

export function CustomerDetailsScreen({ navigation, route }: Props) {
  const customer = MOCK_CUSTOMERS.find((item) => item.id === route.params.customerId);

  return (
    <CustomerDetailView
      navigation={navigation}
      screenTitle="Customer Details"
      customer={customer}
    />
  );
}
