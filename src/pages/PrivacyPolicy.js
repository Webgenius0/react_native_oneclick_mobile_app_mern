import React from 'react';
import LegalDocumentScreen from '../components/legal/LegalDocumentScreen';
import { LEGAL_SLUGS } from '../helpers/legalHelper';

export default function PrivacyPolicy({ navigation }) {
  return (
    <LegalDocumentScreen
      navigation={navigation}
      slug={LEGAL_SLUGS.PRIVACY}
      fallbackTitle="Privacy Policy"
      badgeText="CONFIDENTIAL & SECURE"
    />
  );
}
