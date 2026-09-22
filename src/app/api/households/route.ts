import { NextRequest } from "next/server";
import { createHousehold, listHouseholds } from "@/services/household-service";

export async function GET(request: NextRequest) {
  return listHouseholds(request);
}

export async function POST(request: NextRequest) {
  return createHousehold(request);
}
