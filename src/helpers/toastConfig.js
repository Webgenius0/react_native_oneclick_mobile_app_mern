import React from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';

/**
 * Custom Toast configuration ensuring:
 * 1. text1 and text2 are NEVER truncated with '...' (full multiline display)
 * 2. Toast container height is dynamic ('auto') with comfortable padding
 * 3. Consistent typography and modern rounded border styling
 */
export const toastConfig = {
  success: props => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#10B981',
        borderLeftWidth: 6,
        height: 'auto',
        minHeight: 64,
        width: '92%',
        paddingVertical: 12,
        borderRadius: 14,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 2,
      }}
      text1NumberOfLines={2}
      text2NumberOfLines={0}
      text1Style={{
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
      }}
      text2Style={{
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
        marginTop: 4,
        width: '100%',
      }}
    />
  ),

  error: props => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#EF4444',
        borderLeftWidth: 6,
        height: 'auto',
        minHeight: 64,
        width: '92%',
        paddingVertical: 12,
        borderRadius: 14,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 2,
      }}
      text1NumberOfLines={2}
      text2NumberOfLines={0}
      text1Style={{
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
      }}
      text2Style={{
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
        marginTop: 4,
        width: '100%',
      }}
    />
  ),

  info: props => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#F67922',
        borderLeftWidth: 6,
        height: 'auto',
        minHeight: 64,
        width: '92%',
        paddingVertical: 12,
        borderRadius: 14,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        backgroundColor: '#FFFFFF',
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 2,
      }}
      text1NumberOfLines={2}
      text2NumberOfLines={0}
      text1Style={{
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
      }}
      text2Style={{
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
        marginTop: 4,
        width: '100%',
      }}
    />
  ),
};

