import type {ViewState} from "../types";
import {useAthletes} from "./useAthletes.ts";
import {useAdmin} from "./useAdmin.ts";
import {useGyms} from "./useGyms.ts";

export function useApp(viewState: ViewState, filterGym: string, myGymId: string) {
    const {athletes, loadingData, admins} = useAthletes(viewState, filterGym);

    const {isAdmin, isSuperAdmin} = useAdmin(myGymId);
    const {gyms, loading: gymsLoading} = useGyms();

    return {
        loading: loadingData || gymsLoading,
        athletes,
        gyms,
        isAdmin,
        isSuperAdmin,
        admins
    }
}