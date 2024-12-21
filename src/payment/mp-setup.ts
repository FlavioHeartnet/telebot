import MercadoPagoConfig, { Payment } from "mercadopago";
import { config } from "../config";
import dotenv from "dotenv";
dotenv.config();
export function mpSetup(token?:string){
    try{
        const client = new MercadoPagoConfig({
            accessToken:  token ?? config.access_token ?? "",
          });
          return new Payment(client);
    }catch(e){
        throw new Error("MP Error:" + e)
    }
    
}
