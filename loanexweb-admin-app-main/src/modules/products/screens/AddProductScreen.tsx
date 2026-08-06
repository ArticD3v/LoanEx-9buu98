import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useWizard, WizardProvider } from '../wizard/WizardContext';
import { StepProgress, WIZARD_STEPS } from '../../../components/ui/StepProgress';
import { Button } from '../../../components/ui/Button';
import { Step1BasicInfo } from '../wizard/steps/Step1BasicInfo';
import { Step2Category } from '../wizard/steps/Step2Category';
import { Step3Variants } from '../wizard/steps/Step3Variants';
import { Step4Images } from '../wizard/steps/Step4Images';
import { Step5Pricing } from '../wizard/steps/Step5Pricing';
import { Step6Inventory } from '../wizard/steps/Step6Inventory';
import { Step7Supplier } from '../wizard/steps/Step7Supplier';
import { Step8Delivery } from '../wizard/steps/Step8Delivery';
import { Step9EMI } from '../wizard/steps/Step9EMI';
import { Step10SEO } from '../wizard/steps/Step10SEO';
import { Step11Review } from '../wizard/steps/Step11Review';
import { colors } from '../../../theme/colors';
import { shadow, spacing } from '../../../theme/spacing';
import { RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProduct'>;

const STEP_COMPONENTS = [
  Step1BasicInfo,
  Step2Category,
  Step3Variants,
  Step4Images,
  Step5Pricing,
  Step6Inventory,
  Step7Supplier,
  Step8Delivery,
  Step9EMI,
  Step10SEO,
  Step11Review,
];

function AddProductContent({ navigation, route }: Props) {
  const { currentStep, setCurrentStep, resetForm, formData, updateForm } = useWizard();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isEditMode = route.params?.mode === 'edit';
  const productId = route.params?.productId;
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode && productId) {
      const fetchProduct = async () => {
        try {
          const res = await fetch(`http://localhost:4000/api/v1/products/${productId}`);
          const json = await res.json();
          if (json.success && json.data) {
            const p = json.data;
            const wizardData = p.wizardData || {};
            updateForm({
              ...wizardData,
              productName: p.name || wizardData.productName || '',
              sku: p.sku || wizardData.sku || '',
              brand: p.brand || wizardData.brand || '',
              description: p.description || wizardData.description || '',
              shortDescription: p.shortDescription || wizardData.shortDescription || '',
              category: p.category || wizardData.category || '',
              primaryImage: p.imageUrl || wizardData.primaryImage || null,
              galleryImages: p.images || p.galleryImages || wizardData.galleryImages || [],
              sellingPrice: String(p.price || wizardData.sellingPrice || 0),
              mrp: String(p.mrp || p.price || wizardData.mrp || 0),
              availableStock: String(p.stock || wizardData.availableStock || 0),
              warranty: p.warranty || wizardData.warranty || '',
              hsnCode: p.hsnCode || wizardData.hsnCode || '',
              manufacturer: p.manufacturer || wizardData.manufacturer || '',
            });
          }
        } catch (e) {
          console.warn('Failed to load product', e);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [isEditMode, productId]);

  const animateStep = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setCurrentStep(nextStep), 150);
  };

  const goNext = () => {
    if (currentStep < WIZARD_STEPS.length) animateStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 1) animateStep(currentStep - 1);
  };

  const handleSaveDraft = () => {
    navigation.navigate('ProductList');
  };

  const handlePublish = async () => {
    try {
      const payload = {
        name: formData.productName,
        sku: formData.sku,
        brand: formData.brand,
        description: formData.description,
        shortDescription: formData.shortDescription,
        categoryId: formData.category || undefined,
        image: formData.primaryImage || undefined,
        galleryImages: formData.galleryImages,
        price: parseFloat(formData.sellingPrice) || 0,
        mrp: parseFloat(formData.mrp) || 0,
        stock: parseInt(formData.availableStock, 10) || 0,
        status: 'active',
        emiAvailable: formData.variantsEnabled || true, // adjust based on form
        warranty: formData.warranty,
        hsnCode: formData.hsnCode,
        manufacturer: formData.manufacturer,
        wizardData: formData, // <--- Add all form fields as wizardData
      };

      const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
      const url = isEditMode
        ? `${API_BASE_URL}/api/v1/products/${productId}`
        : `${API_BASE_URL}/api/v1/products`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      Alert.alert('Success', `Product ${isEditMode ? 'updated' : 'published'} successfully`);
      resetForm();
      navigation.navigate('ProductList');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'publish'} product`);
    }
  };

  const StepComponent = STEP_COMPONENTS[currentStep - 1];

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text>Loading product data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{isEditMode ? 'Edit Product' : 'Add Product'}</Text>
          <TouchableOpacity onPress={handleSaveDraft} style={styles.draftBtn}>
            <Text style={styles.draftText}>Save Draft</Text>
          </TouchableOpacity>
        </View>

        <StepProgress currentStep={currentStep} />

        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              <StepComponent />
            </Animated.View>
          </ScrollView>
        </View>

        <View style={[styles.footer, shadow.md]}>
          {currentStep === WIZARD_STEPS.length ? (
            <View style={styles.reviewActions}>
              <Button title="Back" onPress={goPrev} variant="outline" style={{ flex: 1 }} />
              <Button title="Save Draft" onPress={handleSaveDraft} variant="secondary" style={{ flex: 1 }} />
              <Button title={isEditMode ? 'Update Product' : 'Publish Product'} onPress={handlePublish} variant="accent" style={{ flex: 1 }} />
            </View>
          ) : (
            <View style={styles.navActions}>
              <Button title="Previous" onPress={goPrev} variant="outline" disabled={currentStep === 1} style={{ flex: 1 }} />
              <Button
                title={currentStep === 9 ? 'Continue' : 'Next'}
                onPress={goNext}
                variant={currentStep === 9 ? 'accent' : 'primary'}
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export function AddProductScreen(props: Props) {
  return (
    <WizardProvider>
      <AddProductContent {...props} />
    </WizardProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: colors.accent,
  },
  backBtn: { padding: spacing.sm },
  backText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  draftBtn: { padding: spacing.sm },
  draftText: { fontSize: 14, color: colors.accentLight, fontWeight: '600' },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  navActions: { flexDirection: 'row', gap: spacing.md },
  reviewActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
