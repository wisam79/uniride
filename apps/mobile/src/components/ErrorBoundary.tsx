import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logger } from '../lib/logger';
import { Colors } from '../theme';
import { useI18nStore } from '../hooks/useStore';
import { Translations } from '@uniride/core';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  fallbackCrashed: boolean;
}

const MAX_RETRIES = 3;

function t(key: string): string {
  const language = useI18nStore.getState().language;
  return Translations[language]?.[key] ?? Translations['en']?.[key] ?? key;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    fallbackCrashed: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(error.message, {
      componentStack: info.componentStack ?? '',
    });
  }

  handleRetry = () => {
    if (this.state.retryCount >= MAX_RETRIES) return;
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  renderFallback() {
    const { error, retryCount } = this.state;
    const isExhausted = retryCount >= MAX_RETRIES;

    // Truncate error description to max 200 chars
    const errorDescription = error?.message ? error.message.slice(0, 200) : t('unexpected_error');

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('app_error')}</Text>

        <Text style={styles.message}>{errorDescription}</Text>

        {isExhausted ? (
          <Text style={styles.restartMessage}>{t('please_restart')}</Text>
        ) : (
          <TouchableOpacity
            style={[styles.button, isExhausted && styles.buttonDisabled]}
            onPress={this.handleRetry}
            disabled={isExhausted}
            accessibilityRole="button"
            accessibilityState={{ disabled: isExhausted }}
          >
            <Text style={styles.buttonText}>{t('retry')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // If the fallback UI itself crashes, show a hardcoded static string
    if (this.state.fallbackCrashed) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Error</Text>
          <Text style={styles.message}>Please restart the application.</Text>
        </View>
      );
    }

    try {
      return this.renderFallback();
    } catch {
      // Fallback crashed — switch to static hardcoded UI
      this.setState({ fallbackCrashed: true });
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Error</Text>
          <Text style={styles.message}>Please restart the application.</Text>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  restartMessage: {
    fontSize: 14,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
