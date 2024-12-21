import dayjs from "dayjs";
import { supabaseAdmin } from "../supabase";

export default async function isExpired(telegram_id: number) {
  const resp = await supabaseAdmin().from("payments").select(
    "expire_in, payment_status",
  ).eq(
    "telegram_id",
    telegram_id,
  ).order("created_at", { ascending: false }).limit(1);
  if (resp.data) {
    const latestDate = resp.data.reduce((latest, current) => {
      if (current.payment_status == "accredited") {
        const currentDate = dayjs(current.expire_in);
        return !latest || currentDate.isAfter(latest) ? currentDate : latest;
      }
      return null;
    }, null as dayjs.Dayjs | null);
    if (!latestDate) {
      return {
        isExpired: false,
        latestDate: null,
      };
    }
    const now = dayjs();
    const expiration = dayjs(latestDate);

    return now.isAfter(expiration);
  }
}
