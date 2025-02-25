import * as React from "react";
import { useFormContext, Controller, FieldValues, FieldPath } from "react-hook-form";
import { cn } from "@/lib/utils";

const Form = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement> & {
    onSubmit?: () => void;
  }
>(({ className, onSubmit, ...props }, ref) => (
  <form
    ref={ref}
    className={cn("space-y-6", className)}
    {...props}
  />
));
Form.displayName = "Form";

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", className)}
    {...props}
  />
));
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium text-gray-700", className)}
    {...props}
  />
));
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ ...props }, ref) => (
  <div ref={ref} {...props} />
));
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
));
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    name?: string;
  }
>(({ className, children, name, ...props }, ref) => {
  const { formState } = useFormContext() || { formState: { errors: {} } };
  const error = name ? formState?.errors[name] : null;
  const message = error ? String(error.message) : children;

  if (!error && !children) {
    return null;
  }

  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-red-500 mt-1", className)}
      {...props}
    >
      {message}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> {
  name: TName;
  control?: any;
  render: ({ field }: { field: any }) => React.ReactElement;
}

function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({ name, control, render }: FormFieldProps<TFieldValues, TName>) {
  const formContext = useFormContext();
  const finalControl = control || formContext?.control;

  if (!finalControl) {
    console.warn(
      `Form field "${name}" rendered without being wrapped in a Form component or without explicit control prop.`
    );
    return render({ field: { name } });
  }

  return (
    <Controller
      control={finalControl}
      name={name}
      render={({ field }) => render({ field })}
    />
  );
}

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}; 