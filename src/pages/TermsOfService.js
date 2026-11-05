import React from 'react';
import LegalDocumentScreen from '../components/legal/LegalDocumentScreen';
import { LEGAL_SLUGS } from '../helpers/legalHelper';

export default function TermsOfService({ navigation }) {
  return (
    <LegalDocumentScreen
      navigation={navigation}
      slug={LEGAL_SLUGS.TERMS}
      fallbackTitle="Terms of Service"
      badgeText="USER AGREEMENT"
    />
  );
}
