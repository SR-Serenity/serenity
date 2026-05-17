import { api } from './client'
import type {
  ArchiveContactResponse,
  ContactDirectoryItem,
  CreateContactInput,
  ListContactsResponse,
  UpdateContactInput,
} from '../types/contacts'

export const contactsApi = {
  listContacts: async (token: string): Promise<ListContactsResponse> => {
    return api.get('contacts', { token })
  },

  createContact: async (
    token: string,
    input: CreateContactInput,
  ): Promise<ContactDirectoryItem> => {
    return api.post('contacts', { token, body: input })
  },

  updateContact: async (
    token: string,
    contactId: string,
    input: UpdateContactInput,
  ): Promise<ContactDirectoryItem> => {
    return api.patch(`contacts/${contactId}`, { token, body: input })
  },

  archiveContact: async (
    token: string,
    contactId: string,
  ): Promise<ArchiveContactResponse> => {
    return api.delete(`contacts/${contactId}`, { token })
  },
}
