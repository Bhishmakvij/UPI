import { searchContactsByName, findContactByPhone } from '../../src/lib/recipient/contactsService';
import type { Contact } from '../../src/lib/recipient/recipientTypes';

const contacts: Contact[] = [
  { id: '1', name: 'Raj Kumar', firstName: 'Raj', lastName: 'Kumar', phoneNumbers: [{ number: '+91 98765 43210' }] },
  { id: '2', name: 'Rajesh Singh', firstName: 'Rajesh', lastName: 'Singh', phoneNumbers: [{ number: '9765432109' }] },
  { id: '3', name: 'Priya Singh', firstName: 'Priya', lastName: 'Singh', phoneNumbers: [] },
  { id: '4', name: 'Mom', firstName: 'Mom', phoneNumbers: [{ number: '08765432109' }] },
  { id: '5', name: 'Amit Verma', firstName: 'Amit', lastName: 'Verma', nickname: 'Bunty', phoneNumbers: [] },
];

describe('searchContactsByName', () => {
  it('matches case-insensitively across the full name', () => {
    const matches = searchContactsByName('raj', contacts);
    expect(matches.map((m) => m.contact.id).sort()).toEqual(['1', '2']);
  });

  it('reports the matched character range for highlighting', () => {
    const [match] = searchContactsByName('Kumar', contacts).filter((m) => m.contact.id === '1');
    expect(match.matchStart).toBe(4);
    expect(match.matchEnd).toBe(9);
  });

  it('matches against a nickname when the query does not appear in any name field', () => {
    const matches = searchContactsByName('bunty', contacts);
    expect(matches.map((m) => m.contact.id)).toEqual(['5']);
  });

  it('returns no matches for an unmatched query', () => {
    expect(searchContactsByName('Xyz', contacts)).toEqual([]);
  });

  it('returns no matches for empty query', () => {
    expect(searchContactsByName('', contacts)).toEqual([]);
  });

  it('caps results at 10', () => {
    const many: Contact[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `Test Person ${i}`,
      phoneNumbers: [],
    }));
    expect(searchContactsByName('Test', many)).toHaveLength(10);
  });
});

describe('findContactByPhone', () => {
  it('finds a contact by exact 10-digit match', () => {
    expect(findContactByPhone('9765432109', contacts)?.id).toBe('2');
  });

  it('finds a contact whose stored number has a +91 prefix and spaces', () => {
    expect(findContactByPhone('9876543210', contacts)?.id).toBe('1');
  });

  it('returns undefined when no contact owns the number', () => {
    expect(findContactByPhone('0000000000', contacts)).toBeUndefined();
  });

  it('returns undefined for a contact with no phone numbers', () => {
    expect(findContactByPhone('1111111111', [contacts[2]])).toBeUndefined();
  });
});
