import { handleCredentialRequest } from "../_shared/credential-handler.ts";

Deno.serve(handleCredentialRequest);
