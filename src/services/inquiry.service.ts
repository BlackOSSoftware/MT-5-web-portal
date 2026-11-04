import api from "@/api/axios";

export type InquiryPayload = {
  name: string;
  email: string;
  phone: string;
  title: string;
  description: string;
  portalBrokerCode?: string;
};

export type InquiryTicket = {
  _id: string;
  ticketId?: string;
  name: string;
  email?: string;
  phone?: string;
  title: string;
  description: string;
  status: "OPEN" | "REVIEWED" | "CLOSED" | string;
  adminNote?: string;
  reviewedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type MyTicketsResponse = {
  success: boolean;
  data: InquiryTicket[];
  total: number;
  page: number;
  totalPages: number;
};

export const inquiryService = {
  create: async (payload: InquiryPayload) => {
    const { data } = await api.post("/inquiry", {
      ...payload,
      portalBrokerCode:
        payload.portalBrokerCode ||
        process.env.NEXT_PUBLIC_BROKER_CODE ||
        "OCEANAPROFX",
    });
    return data;
  },

  mine: async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get<MyTicketsResponse>("/inquiry/mine", {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 20,
      },
    });
    return data;
  },
};
