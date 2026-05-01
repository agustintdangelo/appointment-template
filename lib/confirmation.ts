type AppointmentConfirmationInput = {
  appointment: {
    id: string;
    confirmationCode: string;
    startAt: Date;
    endAt: Date;
    customerName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    business: {
      name: string;
      email: string | null;
      phone: string | null;
    };
    service: {
      name: string;
      durationMinutes: number;
      bufferMinutes: number;
    };
    staffMember: {
      name: string;
      title: string | null;
    } | null;
  };
  managementToken: string;
};

export function prepareAppointmentConfirmation(input: AppointmentConfirmationInput) {
  return {
    deliveryConfigured: false,
    hasContactDestination: Boolean(input.appointment.contactEmail || input.appointment.contactPhone),
    hasFutureManagementToken: input.managementToken.length > 0,
  };
}
