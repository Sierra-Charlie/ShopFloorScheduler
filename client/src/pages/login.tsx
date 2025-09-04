import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import vikingLogo from "@assets/Viking-logo-2_1756864041230.jpg";

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [agreedToSms, setAgreedToSms] = useState<boolean>(false);

  const form = useForm<LoginUser>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return await response.json();
    },
    onSuccess: (response) => {
      setError("");
      toast({
        title: "Login Successful",
        description: "Welcome to the Manufacturing Assembly System",
      });
      onLoginSuccess(response.user);
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      const errorMessage = error.message || "Login failed. Please check your credentials.";
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginUser) => {
    setError("");
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src={vikingLogo} alt="Viking Logo" className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="tracking-tight font-bold text-center text-[28px]">Viking's Manufacturing Assembly System</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@vikingeng.com"
                {...form.register("email")}
                data-testid="input-email"
                className="w-full"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register("password")}
                data-testid="input-password"
                className="w-full"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription data-testid="text-login-error">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Authorized domains: @vikingeng.com, @stonetreeinvest.com</p>
            <p className="mt-2 text-xs">
              Default credentials for testing:
              <br />
              david.brown@stonetreeinvest.com / admin123
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm">Mobile Number (for SMS alerts)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="(555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                data-testid="input-phone-number"
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreedToSms"
                checked={agreedToSms}
                onCheckedChange={(checked) => setAgreedToSms(!!checked)}
                data-testid="checkbox-agree-sms"
              />
              <Label
                htmlFor="agreedToSms"
                className="text-sm leading-none cursor-pointer"
              >
                I Agree to receive SMS notifications
              </Label>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border text-xs text-gray-600 dark:text-gray-400">
              <p className="text-left">
                By providing your mobile number and selecting 'I Agree,' you consent to receive SMS text message notifications from Viking Engineering regarding real-time Andon Alerts from Viking Engineering production. Message frequency may vary depending on production events. Message and data rates may apply. You may opt out at any time by replying STOP. For help, reply HELP. Your mobile number will only be used for production-related Andon notifications and will not be shared with third parties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}