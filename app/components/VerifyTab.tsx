import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormEvent, useState } from "react";
import { createRequest, getRequestStatus } from "../lib/api";
import { useInterval } from "../lib/hooks";
import { HighLight } from "./highLight";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ExclamationTriangleIcon, CheckboxIcon } from "@radix-ui/react-icons";
import { TypographyH4 } from "./ui/typography";

export function VerifyTab() {
  const [authorizationRequestUri, setAuthorizationRequestUri] =
    useState<string>();
  const [requestId, setRequestId] = useState<string>();
  const [requestStatus, setRequestStatus] = useState<{
    requestId: string;
    responseStatus: "verified" | "error" | "received" | "pending";
    error?: string;
    submission?: Record<string, unknown>;
    definition?: Record<string, unknown>;
    presentations?: Array<string | Record<string, unknown>>;
  }>();

  const enabled =
    requestId !== undefined &&
    requestStatus?.responseStatus !== "verified" &&
    requestStatus?.responseStatus !== "error";

  const hasResponse =
    requestStatus?.responseStatus === "verified" ||
    requestStatus?.responseStatus === "error";
  const isSuccess = requestStatus?.responseStatus === "verified";

  useInterval({
    callback: async () => {
      if (!requestId) return;

      const requestStatus = await getRequestStatus({ requestId });
      setRequestStatus(requestStatus);
    },
    interval: 500,
    enabled,
  });

  async function onSubmitCreateRequest(e: FormEvent) {
    e.preventDefault();

    const request = await createRequest({
      presentationDefinition: {
        id: crypto.randomUUID(),
        // TODO: show this in the paradym wallet
        name: "Animo Playground Credential",
        input_descriptors: [
          {
            id: crypto.randomUUID(),
            constraints: {
              // FIXME: pex we should always do limit disclosure if it's possible
              // FIXME: limit_disclosure is not working
              limit_disclosure: "preferred",
              fields: [
                {
                  path: [
                    "$.playground.framework",
                    "$.credentialSubject.playground.framework",
                    "$.vc.credentialSubject.playground.framework",
                  ],
                  filter: {
                    type: "string",
                    const: "Aries Framework JavaScript",
                  },
                },
              ],
            },
            name: "Animo Playground Credential",
            purpose: "Just for fun",
          },
        ],
      },
    });
    setRequestId(request.requestId);
    setAuthorizationRequestUri(request.authorizationRequestUri);
  }

  return (
    <Card className="p-6">
      <form className="space-y-4" onSubmit={onSubmitCreateRequest}>
        {!hasResponse && (
          <div className="flex justify-center flex-col items-center bg-gray-200 min-h-64 w-full rounded-md">
            {authorizationRequestUri ? (
              <TooltipProvider>
                <Tooltip>
                  <div className="flex flex-col p-5 gap-2 justify-center items-center gap-6">
                    <div className="bg-white p-5 rounded-md w-[296px]">
                      <QRCode size={256} value={authorizationRequestUri} />
                    </div>
                    <TooltipTrigger asChild>
                      <p
                        onClick={(e) =>
                          navigator.clipboard.writeText(
                            e.currentTarget.innerText
                          )
                        }
                        className="text-gray-500 break-all cursor-pointer"
                      >
                        {authorizationRequestUri}
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
                Authorization request will be displayed here
              </p>
            )}
          </div>
        )}
        {hasResponse && (
          <div className="flex flex-col w-full gap-4">
            <Alert variant={isSuccess ? "success" : "warning"}>
              {isSuccess ? (
                <CheckboxIcon className="h-5 w-5" />
              ) : (
                <ExclamationTriangleIcon className="h-4 w-4" />
              )}
              <AlertTitle className={isSuccess ? "mt-0.5" : ""}>
                {isSuccess
                  ? "Verification Successful"
                  : "Verification Unsuccessful"}
              </AlertTitle>
              {!isSuccess && (
                <AlertDescription className="mt-2">
                  {requestStatus?.error ?? "Unknown error occurred"}
                </AlertDescription>
              )}
            </Alert>
            <div>
              <TypographyH4>Presentation Definition</TypographyH4>
              <HighLight
                code={JSON.stringify(requestStatus?.definition, null, 2)}
                language="json"
              />
            </div>
            <div>
              <TypographyH4>Presentation Submission</TypographyH4>
              <HighLight
                code={JSON.stringify(requestStatus?.submission, null, 2)}
                language="json"
              />
            </div>
            <div>
              <TypographyH4>Presentations</TypographyH4>
              <HighLight
                code={JSON.stringify(requestStatus?.presentations, null, 2)}
                language="json"
              />
            </div>
          </div>
        )}
        <Button
          onClick={onSubmitCreateRequest}
          className="w-full"
          onSubmit={onSubmitCreateRequest}
        >
          Verify Credential
        </Button>
      </form>
    </Card>
  );
}
