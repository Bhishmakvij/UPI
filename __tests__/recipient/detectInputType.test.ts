import { detectInputType } from '../../src/lib/recipient/detectInputType';

describe('detectInputType', () => {
  it('detects a plain name', () => {
    expect(detectInputType('Raj')).toEqual({ type: 'contact_name', query: 'Raj' });
    expect(detectInputType('Raj Kumar')).toEqual({ type: 'contact_name', query: 'Raj Kumar' });
  });

  it('detects a bare 10-digit phone number', () => {
    expect(detectInputType('9876543210')).toEqual({
      type: 'phone',
      digits: '9876543210',
      upiId: '9876543210@upi',
    });
  });

  it('detects a spaced phone number', () => {
    expect(detectInputType('98765 43210')).toEqual({
      type: 'phone',
      digits: '9876543210',
      upiId: '9876543210@upi',
    });
  });

  it('detects a +91-prefixed phone number', () => {
    expect(detectInputType('+91 9876543210')).toEqual({
      type: 'phone',
      digits: '9876543210',
      upiId: '9876543210@upi',
    });
  });

  it('detects a UPI ID', () => {
    expect(detectInputType('raj@axis')).toEqual({ type: 'upi_id', upiId: 'raj@axis' });
  });

  it('reports an invalid UPI-shaped input with a reason', () => {
    const result = detectInputType('raj@');
    expect(result.type).toBe('invalid');
  });

  it('treats a still-being-typed phone number as partial', () => {
    expect(detectInputType('+91 987654')).toEqual({ type: 'partial' });
  });

  it('treats mixed letters and digits as partial', () => {
    expect(detectInputType('Raj123')).toEqual({ type: 'partial' });
  });

  it('treats empty input as empty', () => {
    expect(detectInputType('')).toEqual({ type: 'empty' });
    expect(detectInputType('   ')).toEqual({ type: 'empty' });
  });
});
