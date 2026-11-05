import { toastConfig } from '../src/helpers/toastConfig';

describe('Toast Configuration', () => {
  it('defines custom renderers for success, error, and info', () => {
    expect(toastConfig).toHaveProperty('success');
    expect(toastConfig).toHaveProperty('error');
    expect(toastConfig).toHaveProperty('info');
    expect(typeof toastConfig.success).toBe('function');
    expect(typeof toastConfig.error).toBe('function');
    expect(typeof toastConfig.info).toBe('function');
  });

  it('configures text2NumberOfLines as 0 so full notifications are not truncated', () => {
    const errorComponent = toastConfig.error({
      text1: 'Payment Failed',
      text2: 'Failed to make payment request: Connection timeout occurred while contacting gateway server.',
    });

    expect(errorComponent.props.text2NumberOfLines).toBe(0);
    expect(errorComponent.props.text1NumberOfLines).toBe(2);
    expect(errorComponent.props.style.height).toBe('auto');
  });

  it('configures success and info toast components with auto height and full text', () => {
    const successComponent = toastConfig.success({
      text1: 'Order Placed',
      text2: 'Your payment was successfully verified and order is in progress.',
    });
    expect(successComponent.props.text2NumberOfLines).toBe(0);
    expect(successComponent.props.style.height).toBe('auto');

    const infoComponent = toastConfig.info({
      text1: 'Notice',
      text2: 'Please review updated exchange rates before checkout.',
    });
    expect(infoComponent.props.text2NumberOfLines).toBe(0);
    expect(infoComponent.props.style.height).toBe('auto');
  });
});

