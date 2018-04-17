declare module "net-retry-connect" {
  import { WrapOptions } from "retry";
  import { Socket } from "net";

  export function to(
    options: {
      port: number;
      host?: string;
      retryOptions?: WrapOptions;
    },
    callback: (error: Error | undefined, client: Socket | undefined) => void
  ): void;
}
