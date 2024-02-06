import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Label } from "@/components/ui/label";
import {
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectGroup,
  SelectContent,
  Select,
} from "@/components/ui/select";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import QRCode from "react-qr-code";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormEvent, useEffect, useState } from "react";
import { getIssuer, createOffer } from "../lib/api";

export function IssueTab() {
  const [credentialType, setCredentialType] = useState<string>();
  const [issuerDid, setIssuerDid] = useState<string>();
  const [credentialOfferUri, setCredentialOfferUri] = useState<string>();
  const [issuer, setIssuer] = useState<{
    credentialsSupported: Array<{
      id: string;
      display: [{ name: string; description?: string }];
    }>;
    availableDidMethods: string[];
    display: {};
  }>();

  useEffect(() => {
    getIssuer().then(setIssuer);
  }, []);
  async function onSubmitIssueCredential(e: FormEvent) {
    e.preventDefault();
    const _issuerDidMethod = issuerDid ?? issuer?.availableDidMethods[0];
    const _credentialType =
      credentialType ?? issuer?.credentialsSupported[0].id;
    if (!_issuerDidMethod || !_credentialType) {
      throw new Error("No issuer or credential type");
    }

    const offer = await createOffer({
      credentialSupportedId: _credentialType,
      issuerDidMethod: _issuerDidMethod,
    });
    setCredentialOfferUri(offer.credentialOffer);
  }

  return (
    <Card className="p-6">
      <form className="space-y-4" onSubmit={onSubmitIssueCredential}>
        <div className="space-y-2">
          <Label htmlFor="credential-type">Credential Type</Label>
          <Select
            name="credential-type"
            required
            onValueChange={setCredentialType}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue
                placeholder={!issuer ? "Loading" : "Select a credential type"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(issuer?.credentialsSupported ?? []).map((credential) => {
                  return (
                    <SelectItem key={credential.id} value={credential.id}>
                      {credential.display[0].name}
                      {credential.display[0].description
                        ? ` - ${credential.display[0].description}`
                        : ""}
                    </SelectItem>
                  );
                }) ?? null}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issuer-did">Issuer Did</Label>
          <Select name="issuer-did" required onValueChange={setIssuerDid}>
            <SelectTrigger className="w-[320px]">
              <SelectValue
                placeholder={!issuer ? "Loading" : "Select an issuer did"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(issuer?.availableDidMethods ?? []).map(
                  (availableDidMethod) => {
                    return (
                      <SelectItem
                        key={availableDidMethod}
                        value={availableDidMethod}
                      >
                        {availableDidMethod}
                      </SelectItem>
                    );
                  }
                ) ?? null}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-center items-center bg-gray-200 min-h-64 w-full rounded-md">
          {credentialOfferUri ? (
            <TooltipProvider>
              <Tooltip>
                <div className="flex flex-col p-5 gap-2 justify-center items-center gap-6">
                  <div className="bg-white p-5 rounded-md w-[296px]">
                    <QRCode size={256} value={credentialOfferUri} />
                  </div>
                  <TooltipTrigger asChild>
                    <p
                      onClick={(e) =>
                        navigator.clipboard.writeText(e.currentTarget.innerText)
                      }
                      className="text-gray-500 break-all cursor-pointer"
                    >
                      {credentialOfferUri}
                    </p>
                  </TooltipTrigger>
                </div>

                <TooltipContent>
                  <p>Click to copy</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <p className="text-gray-500 break-all">
              Credential offer will be displayed here
            </p>
          )}
        </div>
        <Button
          onClick={onSubmitIssueCredential}
          className="w-full"
          onSubmit={onSubmitIssueCredential}
        >
          Issue Credential
        </Button>
      </form>
      <Alert variant="warning" className="mt-5">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          When using the{" "}
          <a className="underline" href="https://linktr.ee/paradym_id">
            Paradym Wallet
          </a>
          , only issuance of JWT credentials (not SD-JWT credentials) using a
          did method other than <code>did:cheqd</code> is supported.
        </AlertDescription>
      </Alert>
    </Card>
  );
}
