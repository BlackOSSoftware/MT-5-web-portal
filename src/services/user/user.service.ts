import api from "@/api/axios";

/* ================= TYPES ================= */

export type UserProfile = {
  _id: string;
  email: string;
  phone: string;
  name: string;
  isMailVerified: boolean;
  kycStatus: string;
  date_of_birth: string | null;
  gender: "MALE" | "FEMALE" | null;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type UpdateProfilePayload = {
  date_of_birth?: string;
  gender?: "MALE" | "FEMALE";
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};

/* ================= API ================= */

export const userService = {
  getMe: async (): Promise<UserProfile> => {
    const { data } = await api.get("/user/me");
    return data.data;
  },

  updateMe: async (payload: UpdateProfilePayload) => {
    const { data } = await api.put("/user/me", payload);
    return data.data;
  },

   resendVerifyEmail: async (email: string) => {
    const { data } = await api.post("/auth/resend-verify-email", { email });
    return data;
  },
};
