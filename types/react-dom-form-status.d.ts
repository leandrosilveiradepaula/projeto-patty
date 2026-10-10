// React DOM ships useFormStatus at runtime; this project does not currently
// install @types/react-dom. Keep the declaration limited to the consumed API.
declare module "react-dom" {
  export function useFormStatus(): {
    pending: boolean;
    data: FormData | null;
  };
}
