import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { DashboardAppBar } from '../components/DashboardAppBar';
import { SearchBar } from '../components/SearchBar';
import { SummaryCard } from '../components/SummaryCard';
import { QuickActionButton } from '../components/QuickActionButton';
import { SectionHeader } from '../components/SectionHeader';
import { ActivityItem } from '../components/ActivityItem';
import {
  GlobalSearchResults,
  SearchResultItem,
} from '../components/GlobalSearchResults';
import { ProfileMenu } from '../components/ProfileMenu';
import { summaryCards, quickActions, recentActivities } from '../data/mockData';
import { useTheme } from '../../theme/useTheme';
import { authCardStyle, spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const isSearching = searchQuery.trim().length > 0;

  const handleSearchSelect = (item: SearchResultItem) => {
    Keyboard.dismiss();
    setSearchQuery('');

    if (item.type === 'product') {
      navigation.navigate('ProductDetails', { productId: item.id });
      return;
    }
    if (item.type === 'order') {
      navigation.navigate('OrderDetails', { orderId: item.id });
      return;
    }
    if (item.type === 'customer') {
      navigation.navigate('CustomerDetails', { customerId: item.id });
      return;
    }
    navigation.navigate('EmiApplicationDetails', { applicationId: item.id });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            }),
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DashboardAppBar
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => setProfileMenuVisible(true)}
      />

      <View style={styles.body}>
        <View style={styles.searchWrap}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {isSearching ? (
          <View style={styles.searchResults}>
            <GlobalSearchResults query={searchQuery} onSelect={handleSearchSelect} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.summaryGrid}>
              {summaryCards.map((card) => (
                <SummaryCard
                  key={card.id}
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                />
              ))}
            </View>

            <View style={styles.section}>
              <SectionHeader title="Quick Actions" />
              <View style={styles.actionsGrid}>
                {quickActions.map((action) => (
                  <QuickActionButton
                    key={action.id}
                    title={action.title}
                    icon={action.icon}
                    onPress={() => {
                      if (action.title === 'Products') {
                        navigation.navigate('ProductList');
                        return;
                      }
                      if (action.title === 'Customers') {
                        navigation.navigate('CustomerList');
                        return;
                      }
                      if (action.title === 'Orders') {
                        navigation.navigate('OrderList');
                        return;
                      }
                      if (action.title === 'EMI') {
                        navigation.navigate('EmiApplicationList');
                        return;
                      }
                      if (action.title === 'Reports') {
                        navigation.navigate('ReportsHome');
                        return;
                      }
                      if (action.title === 'Users') {
                        navigation.navigate('UserList');
                        return;
                      }
                      if (action.title === 'Settings') {
                        navigation.navigate('SettingsHome');
                        return;
                      }
                      navigation.navigate('ModulePlaceholder', { title: action.title });
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <SectionHeader title="Recent Activity" />
              {recentActivities.map((activity, index) => (
                <ActivityItem
                  key={activity.id}
                  title={activity.title}
                  description={activity.description}
                  time={activity.time}
                  icon={activity.icon}
                  isLast={index === recentActivities.length - 1}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <ProfileMenu
        visible={profileMenuVisible}
        onClose={() => setProfileMenuVisible(false)}
        onMyProfile={() => navigation.navigate('MyProfile')}
        onChangePassword={() => navigation.navigate('ChangePassword')}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    body: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    searchWrap: {
      marginBottom: spacing.lg,
    },
    searchResults: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    section: {
      marginBottom: spacing.xl,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      ...authCardStyle,
    },
  });
}
