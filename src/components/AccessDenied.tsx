import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function AccessDenied() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldX className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Admin area</CardTitle>
          <CardDescription>
            This area is for administrators only. Your personal wishlist and wardrobe live in your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => navigate('/account')} className="w-full">
            <User className="mr-2 h-4 w-4" />
            Go to my account
          </Button>
          <Button onClick={signOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
