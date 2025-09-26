"use client";

import { Form, FormControl, FormField, FormItem, FormMessage, FormStateMessage } from "./ui/form";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { ActionResult, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AlertTitle, alertVariants } from "./ui/alert";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { z } from "zod";

const SPRING = {
  type: "spring" as const,
  stiffness: 130.40,
  damping: 14.50,
  mass: 1,
};

// Auth schemas
const loginSchema = z.object({
  email: z.string().min(1, { message: "Email is required." }).email({ message: "Invalid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signupSchema = z.object({
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
  email: z.string().min(1, { message: "Email is required." }).email({ message: "Invalid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginSchema = z.infer<typeof loginSchema>;
type SignupSchema = z.infer<typeof signupSchema>;

const SubmissionStateMessage = ({ value, reset }: { value: ActionResult<string> | null, reset: () => void }) => {
  const form = useFormContext<LoginSchema | SignupSchema>();

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      reset();
    }
  }, [form.formState.errors, reset]);
  
  return (
    <FormStateMessage>
      {value?.success === true && (
        <motion.div
          key={value.id}
          className={cn(
            alertVariants({ variant: "success" }),
            "absolute top-0 left-0 right-0 mx-auto w-max"
          )}
          exit={{ opacity: 0, y: 10, scale: 0.8 }}
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING}
        >
          <CheckCircledIcon />
          <AlertTitle>{value.data}</AlertTitle>
        </motion.div>
      )}
    </FormStateMessage>
  )
}



export const FormAuth = ({
  input,
  submit,
}: {
  input: (props: React.ComponentProps<"input">) => React.ReactNode;
  submit: (props: React.ComponentProps<"button">) => React.ReactNode;
}) => {
  const [submissionState, setSubmissionState] = useState<ActionResult<string> | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const { login, register } = useAuth();

  const schema = isSignup ? signupSchema : loginSchema;
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: isSignup 
      ? { username: '', email: '', password: '' }
      : { email: '', password: '' }
  });

  async function onSubmit(values: any) {
    let result;
    
    if (isSignup) {
      result = await register({
        username: values.username,
        email: values.email,
        password: values.password,
      });
    } else {
      result = await login({
        email: values.email,
        password: values.password,
      });
    }

    const state: ActionResult<string> = result.success 
      ? {
          success: true,
          data: isSignup ? "Welcome to Honk! Your account has been created." : "Welcome back to Honk!",
          id: crypto.randomUUID()
        }
      : {
          success: false,
          message: result.message || "Authentication failed",
          id: crypto.randomUUID()
        };

    setSubmissionState(state);

    if (result.success) {
      // Redirect to postcard page immediately after successful login/signup
      window.location.href = '/postcard';
    } else {
      // Set form errors for specific fields
      if (result.message && result.message.includes('email')) {
        form.setError("email", { message: result.message });
      } else if (result.message && result.message.includes('password')) {
        form.setError("password", { message: result.message });
      } else {
        form.setError("email", { message: result.message || "Authentication failed" });
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="relative pt-10 lg:pt-12 space-y-4">
        <SubmissionStateMessage value={submissionState} reset={() => setSubmissionState(null)} />

        {isSignup && (
          <FormField
            control={form.control}
            name={"username" as any}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormMessage>
                  {(error) => (
                    <motion.div
                      key={error}
                      className={cn(
                        alertVariants({ variant: "destructive" }),
                        "absolute top-0 left-0 right-0 mx-auto w-max"
                      )}
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.8 }}
                      transition={SPRING}
                    >
                      <CrossCircledIcon />
                      <AlertTitle>{error}</AlertTitle>
                    </motion.div>
                  )}
                </FormMessage>
                <FormControl>
                  <div className="relative mb-4">
                    {input({ 
                      ...field, 
                      placeholder: "Enter your username",
                      autoComplete: "username"
                    })}
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormMessage>
                {(error) => (
                  <motion.div
                    key={error}
                    className={cn(
                      alertVariants({ variant: "destructive" }),
                      "absolute top-0 left-0 right-0 mx-auto w-max"
                    )}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={SPRING}
                  >
                    <CrossCircledIcon />
                    <AlertTitle>{error}</AlertTitle>
                  </motion.div>
                )}
              </FormMessage>
              <FormControl>
                <div className="relative mb-4">
                  {input({ 
                    ...field, 
                    type: "email",
                    placeholder: "Enter your email",
                    autoComplete: "email"
                  })}
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormMessage>
                {(error) => (
                  <motion.div
                    key={error}
                    className={cn(
                      alertVariants({ variant: "destructive" }),
                      "absolute top-0 left-0 right-0 mx-auto w-max"
                    )}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={SPRING}
                  >
                    <CrossCircledIcon />
                    <AlertTitle>{error}</AlertTitle>
                  </motion.div>
                )}
              </FormMessage>
              <FormControl>
                <div className="relative">
                  {input({ 
                    ...field, 
                    type: "password",
                    placeholder: "Enter your password",
                    autoComplete: isSignup ? "new-password" : "current-password"
                  })}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    {submit({
                      type: "submit",
                      disabled: form.formState.isSubmitting,
                    })}
                  </div>
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              form.reset();
              setSubmissionState(null);
            }}
            className="text-sm text-white/70 hover:text-white transition-colors underline"
          >
            {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </form>
    </Form>
  );
};